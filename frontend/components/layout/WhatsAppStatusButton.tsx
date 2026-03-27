"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import type { WAStatus } from "@/lib/types";

interface WAInfo {
  name?: string;
  phone?: string;
  connected_at?: string;
  wa_type?: "qr" | "meta";
}

type ConnectionMethod = "qr" | "meta";

const WA_ICON = (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.214l4.297-1.376A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.25 0-4.348-.634-6.131-1.733l-.44-.262-2.551.818.832-2.487-.287-.468A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

export default function WhatsAppStatusButton({
  compact = false,
  onOpen,
  forceOpen = false,
  hideButton = false,
}: {
  compact?: boolean;
  onOpen?: () => void;
  forceOpen?: boolean;
  hideButton?: boolean;
}) {
  const [status, setStatus] = useState<WAStatus["status"]>("disconnected");
  const [waType, setWaType] = useState<"qr" | "meta">("qr");
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [info, setInfo] = useState<WAInfo | null>(null);
  const [connectedAt, setConnectedAt] = useState("");
  const [method, setMethod] = useState<ConnectionMethod | null>(null);

  // Meta form
  const [phoneId, setPhoneId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [metaError, setMetaError] = useState("");

  const autoQrStarted = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const d = await apiGet<WAStatus>("/whatsapp/status");
      setStatus(d.status);
      if (d.wa_type) setWaType(d.wa_type);
    } catch {}
  }, []);

  const fetchInfo = useCallback(async () => {
    try {
      const d = await apiGet<WAInfo>("/whatsapp/info");
      setInfo(d);
      if (d.connected_at) {
        setConnectedAt(
          new Date(d.connected_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        );
      }
    } catch {
      setInfo(null);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-open when forceOpen flips to true
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  // Fetch info when modal opens on connected state
  useEffect(() => {
    if (open && status === "connected") fetchInfo();
  }, [open, status, fetchInfo]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      autoQrStarted.current = false;
      if (status === "disconnected") {
        setMethod(null);
        setQr(null);
      }
    }
  }, [open]);

  const handleStartQR = async () => {
    if (autoQrStarted.current) return;
    autoQrStarted.current = true;
    setConnecting(true);
    try {
      await apiPost("/whatsapp/connect");
      setStatus("qr_pending");
    } catch {
      autoQrStarted.current = false;
    } finally {
      setConnecting(false);
    }
  };

  // Poll QR while modal open and pending
  useEffect(() => {
    if (!open || status !== "qr_pending") return;
    const iv = setInterval(async () => {
      try {
        const d = await apiGet<{ qr?: string; status: string }>("/whatsapp/qr");
        if (d.status === "connected") {
          setStatus("connected");
          setQr(null);
          clearInterval(iv);
          fetchInfo();
        } else if (d.qr) {
          setQr(d.qr);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, [open, status, fetchInfo]);

  const handleSwitchMethod = (m: ConnectionMethod) => {
    setMethod(m);
    setMetaError("");
    autoQrStarted.current = false;
    if (m === "qr" && status === "disconnected") {
      handleStartQR();
    }
  };

  const handleConnectMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setMetaError("");
    if (!phoneId.trim() || !wabaId.trim() || !accessToken.trim()) {
      setMetaError("All three fields are required.");
      return;
    }
    setConnecting(true);
    try {
      await apiPost("/whatsapp/connect/meta", {
        phone_id: phoneId.trim(),
        waba_id: wabaId.trim(),
        access_token: accessToken.trim(),
      });
      setStatus("connected");
      setWaType("meta");
      fetchInfo();
    } catch (err: any) {
      setMetaError(err.message || "Failed to connect. Check your credentials.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiPost("/whatsapp/disconnect");
      setStatus("disconnected");
      setWaType("qr");
      setInfo(null);
      setQr(null);
      setPhoneId("");
      setWabaId("");
      setAccessToken("");
      setMetaError("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleOpen = () => {
    onOpen?.();
    setOpen(true);
  };

  const isConnected = status === "connected";
  const isPending = status === "qr_pending";

  return (
    <>
      {/* Sidebar button */}
      {!hideButton && (
        <button
          onClick={handleOpen}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isConnected
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
              : isPending
              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/30"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isConnected
                ? "bg-emerald-500"
                : isPending
                ? "bg-amber-400 animate-pulse"
                : "bg-red-500 animate-pulse"
            }`}
          />
          <span className="truncate flex-1 text-left">
            {isConnected
              ? info?.phone
                ? `Connected · ${info.phone}`
                : "WhatsApp Connected"
              : isPending
              ? "Connecting…"
              : "Connect WhatsApp"}
          </span>
          <svg
            className="w-3 h-3 shrink-0 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="WhatsApp">
        <div className="flex flex-col items-center gap-5 py-2">

          {/* ── Connected ── */}
          {isConnected ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-500">
                {WA_ICON}
              </div>
              <div className="text-center">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">Connected</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {waType === "meta" ? "Via Meta Business API" : "Via QR Code"}
                </p>
              </div>
              <div className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {[
                  { label: "Name", value: info?.name || "—" },
                  { label: "Phone", value: info?.phone || "—" },
                  { label: "Connected at", value: connectedAt || "—" },
                  { label: "Method", value: waType === "meta" ? "Meta Business API" : "QR Code" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                  >
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{row.label}</span>
                    <span suppressHydrationWarning className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {disconnecting ? (
                  <Spinner className="text-white" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                Disconnect
              </button>
            </>

          ) : (
            /* ── Disconnected / Pending ── */
            <>
              {/* Method selector — always visible when disconnected and no method chosen yet */}
              {status === "disconnected" && !method && (
                <>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">Connect WhatsApp</p>
                    <p className="text-xs text-gray-400 mt-1">Choose how you want to connect</p>
                  </div>
                  <div className="w-full grid grid-cols-2 gap-3">
                    {[
                      { id: "qr" as ConnectionMethod, label: "QR Code", sub: "Scan with phone", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /> },
                      { id: "meta" as ConnectionMethod, label: "Meta API", sub: "Business account", icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /> },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSwitchMethod(opt.id)}
                        className="flex flex-col items-center gap-2.5 p-5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                      >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 group-hover:text-indigo-600 transition-all">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>{opt.icon}</svg>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{opt.label}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{opt.sub}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Back button — visible whenever a method is active */}
              {(method || status === "qr_pending") && (
                <div className="w-full flex items-center gap-2">
                  <button
                    onClick={async () => {
                      // Destroy QR session if pending
                      if (status === "qr_pending") {
                        try { await apiPost("/whatsapp/disconnect"); } catch {}
                        setStatus("disconnected");
                      }
                      setMethod(null);
                      autoQrStarted.current = false;
                      setQr(null);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                  </button>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 ml-1">
                    {method === "meta" ? "Meta Business API" : "QR Code"}
                  </p>
                </div>
              )}

              {/* ── QR view ── */}
              {method === "qr" && (
                <div className="w-full flex flex-col items-center gap-4">
                  {status === "disconnected" && connecting && (
                    <div className="w-56 h-56 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-3">
                      <Spinner />
                      <p className="text-xs text-gray-400">Starting session…</p>
                    </div>
                  )}
                  {(status === "qr_pending" || (status === "disconnected" && !connecting)) && (
                    <>
                      {qr ? (
                        <img
                          src={qr}
                          alt="QR Code"
                          className="w-56 h-56 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 shadow-lg"
                        />
                      ) : (
                        <div className="w-56 h-56 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-3">
                          <Spinner />
                          <p className="text-xs text-gray-400">Generating QR…</p>
                        </div>
                      )}
                      <div className="text-center space-y-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Open WhatsApp → <span className="font-semibold text-gray-700 dark:text-gray-300">Settings → Linked Devices → Link a Device</span>
                        </p>
                        <p className="text-[11px] text-gray-400">QR refreshes every ~20 seconds</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Meta API form ── */}
              {method === "meta" && status === "disconnected" && (
                <form onSubmit={handleConnectMeta} className="w-full flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Phone Number ID</label>
                    <input
                      type="text"
                      value={phoneId}
                      onChange={(e) => setPhoneId(e.target.value)}
                      placeholder="e.g. 123456789012345"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">WhatsApp Business Account ID</label>
                    <input
                      type="text"
                      value={wabaId}
                      onChange={(e) => setWabaId(e.target.value)}
                      placeholder="e.g. 987654321098765"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Permanent Access Token</label>
                    <input
                      type="password"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="EAAxxxx…"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                  {metaError && (
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{metaError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={connecting}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 text-sm mt-1"
                  >
                    {connecting ? <Spinner className="text-white" /> : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {connecting ? "Connecting…" : "Connect"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
