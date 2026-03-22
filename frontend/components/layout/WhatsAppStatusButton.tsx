"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import type { WAStatus } from "@/lib/types";

export default function WhatsAppStatusButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [status, setStatus] = useState<WAStatus["status"]>("disconnected");
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const d = await apiGet<WAStatus>("/whatsapp/status");
      setStatus(d.status);
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!open || status === "connected") return;
    const iv = setInterval(async () => {
      try {
        const d = await apiGet<{ qr?: string; status: string }>("/whatsapp/qr");
        if (d.status === "connected") {
          setStatus("connected");
          setQr(null);
          clearInterval(iv);
        } else if (d.qr) setQr(d.qr);
      } catch {}
    }, 3000);
    return () => clearInterval(iv);
  }, [open, status]);

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

  const isActive = status === "connected";

  return (
    <>
      <button
        onClick={() => !isActive && setOpen(true)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
          isActive
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default"
            : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}
        />
        <span className="truncate">
          {isActive ? "WhatsApp Connected" : "Connect WhatsApp"}
        </span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Connect WhatsApp"
      >
        <div className="flex flex-col items-center gap-5 py-2">
          {status === "connected" ? (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                WhatsApp Connected!
              </p>
            </>
          ) : status === "qr_pending" ? (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                Scan with your WhatsApp mobile app
              </p>
              {qr ? (
                <img
                  src={qr}
                  alt="QR Code"
                  className="w-56 h-56 rounded-2xl border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-56 h-56 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  <Spinner />
                </div>
              )}
              <p className="text-xs text-gray-400">
                WhatsApp → Linked Devices → Link a Device
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-400"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.214l4.297-1.376A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.25 0-4.348-.634-6.131-1.733l-.44-.262-2.551.818.832-2.487-.287-.468A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  Connect your WhatsApp
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Scan a QR code with your phone to start sending
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50"
              >
                {connecting && <Spinner className="text-white" />}
                Generate QR Code
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
