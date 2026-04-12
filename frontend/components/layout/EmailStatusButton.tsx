"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";

interface EmailStatus {
  status: "connected" | "disconnected";
  email?: string;
  display_name?: string;
}

const PROVIDERS = [
  { id: "gmail",   label: "Gmail",          hint: "Use an App Password (not your main password)" },
  { id: "outlook", label: "Outlook / Hotmail", hint: "Use your Outlook password" },
  { id: "yahoo",   label: "Yahoo Mail",     hint: "Use an App Password from Yahoo security settings" },
  { id: "zoho",    label: "Zoho Mail",      hint: "Use your Zoho password or app-specific password" },
  { id: "custom",  label: "Custom SMTP",    hint: "Enter your SMTP server details" },
];

const EMAIL_ICON = (
  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export default function EmailStatusButton({ compact = false }: { compact?: boolean }) {
  const [status, setStatus]           = useState<"connected" | "disconnected" | "loading">("loading");
  const [emailAddr, setEmailAddr]     = useState("");
  const [open, setOpen]               = useState(false);
  const [connecting, setConnecting]   = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectError, setConnectError]   = useState("");

  // Form state
  const [provider, setProvider]       = useState("gmail");
  const [formEmail, setFormEmail]     = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [smtpHost, setSmtpHost]       = useState("");
  const [smtpPort, setSmtpPort]       = useState("587");
  const [showPassword, setShowPassword] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const d = await apiGet<EmailStatus>("/email/status");
      setStatus(d.status);
      if (d.email) setEmailAddr(d.email);
    } catch {}
  }, []);

  // Poll every 6s when disconnected/loading (catches reconnect after login),
  // every 30s once connected (just health-check).
  useEffect(() => {
    fetchStatus();
    const iv = setInterval(() => { fetchStatus(); }, status === "connected" ? 30_000 : 6_000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status === "connected"]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectError("");
    setConnecting(true);
    try {
      await apiPost("/email/connect", {
        email:        formEmail.trim(),
        password:     formPassword,
        provider:     provider === "custom" ? undefined : provider,
        smtp_host:    provider === "custom" ? smtpHost.trim() : undefined,
        smtp_port:    provider === "custom" ? parseInt(smtpPort) : undefined,
        display_name: formEmail.trim(),
      });
      setStatus("connected");
      setEmailAddr(formEmail.trim());
      setFormPassword("");
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiPost("/email/disconnect", {});
      setStatus("disconnected");
      setEmailAddr("");
    } catch {}
    finally { setDisconnecting(false); }
  };

  const isConnected = status === "connected";
  const isLoading   = status === "loading";
  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  const inputCls = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all";
  const labelCls = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
          isConnected
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
            : isLoading
              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/30"
        }`}
      >
        <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? "bg-emerald-500" : isLoading ? "bg-amber-400 animate-pulse" : "bg-red-500 animate-pulse"}`} />
        <span className="truncate flex-1 text-left">
          {isConnected ? (emailAddr ? `Mail · ${emailAddr}` : "Email Connected") : isLoading ? "Checking…" : "Connect Email"}
        </span>
        <svg className="w-3 h-3 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Email Account">
        <div className="flex flex-col gap-5 py-1">

          {isConnected ? (
            /* ── Connected view ── */
            <>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-500 mx-auto">
                {EMAIL_ICON}
              </div>
              <div className="text-center">
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">Connected</p>
                <p className="text-xs text-gray-400 mt-0.5">{emailAddr}</p>
              </div>
              <div className="w-full rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden text-sm">
                {[
                  { label: "Email",    value: emailAddr || "—" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-semibold text-gray-400">{row.label}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[180px]">{row.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all disabled:opacity-50 text-sm"
              >
                {disconnecting ? <Spinner className="text-white" /> : "Disconnect"}
              </button>
            </>
          ) : (
            /* ── Connect form ── */
            <form onSubmit={handleConnect} className="space-y-4">
              {/* Provider selector */}
              <div>
                <label className={labelCls}>Email Provider</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setProvider(p.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        provider === p.id
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-gray-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-indigo-400"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {selectedProvider && (
                  <p className="text-[11px] text-indigo-500 dark:text-indigo-400 mt-2 leading-relaxed">
                    💡 {selectedProvider.hint}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email Address</label>
                <input type="email" required value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  placeholder="you@gmail.com" className={inputCls} />
              </div>

              {/* Password / App Password */}
              <div>
                <label className={labelCls}>
                  {provider === "gmail" ? "App Password" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder={provider === "gmail" ? "xxxx xxxx xxxx xxxx" : "••••••••"}
                    className={`${inputCls} pr-10`}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPassword
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>

              {/* Custom SMTP fields */}
              {provider === "custom" && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className={labelCls}>SMTP Host</label>
                    <input type="text" required value={smtpHost} onChange={e => setSmtpHost(e.target.value)}
                      placeholder="smtp.example.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Port</label>
                    <input type="number" required value={smtpPort} onChange={e => setSmtpPort(e.target.value)}
                      placeholder="587" className={inputCls} />
                  </div>
                </div>
              )}

              {/* Gmail help link */}
              {provider === "gmail" && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  <strong>Gmail setup:</strong> Go to Google Account → Security → 2-Step Verification → App passwords. Generate a password for "Mail" and paste it above.
                </div>
              )}

              {connectError && (
                <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5">
                  {connectError}
                </p>
              )}

              <button
                type="submit"
                disabled={connecting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
              >
                {connecting ? <><Spinner className="text-white" /> Connecting…</> : "Connect Email →"}
              </button>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
