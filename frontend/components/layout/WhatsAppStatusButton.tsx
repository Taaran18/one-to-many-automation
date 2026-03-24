"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import type { WAStatus } from "@/lib/types";

interface WAInfo {
  name?: string;
  phone?: string;
  connected_at?: string;
}

const WA_ICON = (
  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.214l4.297-1.376A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.25 0-4.348-.634-6.131-1.733l-.44-.262-2.551.818.832-2.487-.287-.468A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
);

export default function WhatsAppStatusButton({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<WAStatus["status"]>("disconnected");
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [info, setInfo] = useState<WAInfo | null>(null);
  const [connectedAt, setConnectedAt] = useState("");

  const fetchStatus = useCallback(async () => {
    try {
      const d = await apiGet<WAStatus>("/whatsapp/status");
      setStatus(d.status);
    } catch {}
  }, []);

  const fetchInfo = useCallback(async () => {
    try {
      const d = await apiGet<WAInfo>("/whatsapp/info");
      setInfo(d);
      if (d.connected_at) {
        setConnectedAt(new Date(d.connected_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }));
      }
    } catch { setInfo(null); }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Fetch info when modal opens on connected state
  useEffect(() => {
    if (open && status === "connected") fetchInfo();
  }, [open, status, fetchInfo]);

  // Poll QR while modal is open and pending
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

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await apiPost("/whatsapp/connect");
      setStatus("qr_pending");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiPost("/whatsapp/disconnect");
      setStatus("disconnected");
      setInfo(null);
      setQr(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = status === "connected";
  const isPending = status === "qr_pending";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          isConnected
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
            : isPending
            ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100"
            : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/30"
        }`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? "bg-emerald-500" : isPending ? "bg-amber-400 animate-pulse" : "bg-red-500 animate-pulse"}`} />
        <span className="truncate flex-1 text-left">
          {isConnected ? (info?.phone ? `Connected · ${info.phone}` : "WhatsApp Connected") : isPending ? "Connecting…" : "Connect WhatsApp"}
        </span>
        <svg className="w-3 h-3 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="WhatsApp">
        <div className="flex flex-col items-center gap-5 py-2">

          {isConnected ? (
            /* ── Connected ── */
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-500">
                {WA_ICON}
              </div>
              <div className="text-center">
                <p className="font-bold text-emerald-600 dark:text-emerald-400">Connected</p>
                <p className="text-xs text-gray-400 mt-0.5">Your WhatsApp is active and ready to send</p>
              </div>

              <div className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {[
                  { label: "Name", value: info?.name || "—" },
                  { label: "Phone", value: info?.phone || "—" },
                  { label: "Connected at", value: connectedAt || "—" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{row.label}</span>
                    <span suppressHydrationWarning className="text-xs font-semibold text-gray-700 dark:text-gray-300">{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {disconnecting ? <Spinner className="text-white" /> : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                )}
                Logout &amp; Disconnect
              </button>
            </>

          ) : isPending ? (
            /* ── QR pending ── */
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Open WhatsApp on your phone and scan this code
              </p>
              {qr ? (
                <img src={qr} alt="QR Code" className="w-56 h-56 rounded-2xl border border-gray-200 dark:border-gray-700" />
              ) : (
                <div className="w-56 h-56 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-3">
                  <Spinner />
                  <p className="text-xs text-gray-400">Generating QR…</p>
                </div>
              )}
              <div className="text-center text-xs text-gray-400 space-y-1">
                <p>On WhatsApp: <span className="font-semibold text-gray-600 dark:text-gray-300">Settings → Linked Devices → Link a Device</span></p>
                <p className="text-gray-300 dark:text-gray-600">QR refreshes every ~20 seconds</p>
              </div>
            </>

          ) : (
            /* ── Disconnected ── */
            <>
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                {WA_ICON}
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Connect your WhatsApp</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">Scan a QR code to start sending messages to your leads</p>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {connecting ? <Spinner className="text-white" /> : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                )}
                {connecting ? "Starting…" : "Generate QR Code"}
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
