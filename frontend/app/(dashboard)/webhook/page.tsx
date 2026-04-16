"use client";

import { useState, useEffect, useCallback } from "react";
import WhatsAppStatusButton from "@/components/layout/WhatsAppStatusButton";
import Spinner from "@/components/ui/Spinner";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface KeyData {
  key: string;
  webhook_token: string | null;
  created_at: string;
  last_used: string | null;
  webhook_last_used: string | null;
}

interface WAStatus {
  status: string;
  wa_type: "qr" | "meta";
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  loading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          {description}
        </p>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50"
          >
            {loading && <Spinner className="text-white" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Docs Popup (bottom-right floating button) ────────────────────────────────

function DocsPopup({
  backendUrl,
  apiKey,
  webhookToken,
}: {
  backendUrl: string;
  apiKey: string | null;
  webhookToken: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const webhookUrl = webhookToken ? `${backendUrl}/v1/webhook/${webhookToken}` : `${backendUrl}/v1/webhook/{your-token}`;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Integration guide"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all text-lg"
      >
        ?
      </button>

      {/* Slide-over panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Integration Guide
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  How to use your Webhook URL and API Key
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 px-6 py-6 space-y-8 text-sm">

              {/* ── Webhook Section ── */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Webhook URL</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Best for <strong className="text-gray-700 dark:text-gray-300">Zapier, Make, n8n</strong> and other no-code tools.
                  The token is in the URL — no headers needed.
                </p>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Endpoint</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono border border-gray-200 dark:border-slate-700 break-all">
                      POST {webhookUrl}
                    </code>
                    <button
                      onClick={() => copy(`POST ${webhookUrl}`, 0)}
                      className="shrink-0 text-xs bg-gray-100 dark:bg-slate-800 text-gray-500 px-2.5 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                    >
                      {copiedIdx === 0 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Body (JSON)</p>
                  <pre className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-mono border border-gray-200 dark:border-slate-700 overflow-auto">{`{
  "phone": "+919876543210",
  "message": "Hello from Zapier!"
}`}</pre>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    Zapier / Make setup
                  </p>
                  <ol className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1 list-decimal list-inside leading-relaxed">
                    <li>Add a "Webhooks by Zapier" → POST action</li>
                    <li>Paste your Webhook URL in the URL field</li>
                    <li>Set Payload Type to JSON</li>
                    <li>Add fields: <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 rounded">phone</code> and <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 rounded">message</code></li>
                  </ol>
                </div>
              </section>

              <hr className="border-gray-100 dark:border-gray-800" />

              {/* ── API Key Section ── */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">API Key</h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Best for <strong className="text-gray-700 dark:text-gray-300">Postman, custom code, or any HTTP client</strong>.
                  Pass the key in a header.
                </p>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Endpoint</p>
                  <code className="block bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs text-indigo-600 dark:text-indigo-400 font-mono border border-gray-200 dark:border-slate-700 break-all">
                    POST {backendUrl}/v1/send
                  </code>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Headers</p>
                  <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden text-xs font-mono">
                    {[
                      { k: "Content-Type", v: "application/json" },
                      { k: "X-API-Key", v: apiKey ? apiKey.slice(0, 14) + "..." : "otm_your-key" },
                    ].map((row) => (
                      <div key={row.k} className="flex border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                        <span className="w-36 shrink-0 px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 text-gray-500 border-r border-gray-100 dark:border-gray-800">
                          {row.k}
                        </span>
                        <span className="px-4 py-2.5 text-gray-700 dark:text-gray-300 break-all">
                          {row.v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Body (JSON)</p>
                  <pre className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-mono border border-gray-200 dark:border-slate-700 overflow-auto">{`{
  "phone": "+919876543210",
  "message": "Hello from API!"
}`}</pre>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">cURL example</p>
                    <button
                      onClick={() =>
                        copy(
                          `curl -X POST ${backendUrl}/v1/send \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: ${apiKey || "your-api-key"}" \\\n  -d '{"phone":"+919876543210","message":"Hello!"}'`,
                          1
                        )
                      }
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
                    >
                      {copiedIdx === 1 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-mono border border-gray-200 dark:border-slate-700 overflow-auto whitespace-pre-wrap">{`curl -X POST ${backendUrl}/v1/send \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey ? apiKey.slice(0, 14) + "..." : "your-api-key"}" \\
  -d '{"phone":"+919876543210","message":"Hello!"}'`}</pre>
                </div>
              </section>

              <hr className="border-gray-100 dark:border-gray-800" />

              {/* ── Response ── */}
              <section className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Success Response</p>
                <pre className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono border border-gray-200 dark:border-slate-700">
                  {`{ "success": true }`}
                </pre>
              </section>

            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Key Card ─────────────────────────────────────────────────────────────────

function KeyCard({
  label,
  description,
  accentClass,
  value,
  maskedValue,
  revealed,
  onToggleReveal,
  copied,
  onCopy,
  createdAt,
  lastUsed,
  onRegenerate,
  regenerating,
  onRevoke,
  generateLabel,
  regenerateLabel,
}: {
  label: string;
  description: string;
  accentClass: string;
  value: string | null;
  maskedValue: string;
  revealed: boolean;
  onToggleReveal: () => void;
  copied: boolean;
  onCopy: () => void;
  createdAt?: string | null;
  lastUsed?: string | null;
  onRegenerate: () => void;
  regenerating: boolean;
  onRevoke: () => void;
  generateLabel: string;
  regenerateLabel: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
      <div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>

      {/* Value display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {value ? "Your token" : "Not generated"}
          </p>
          {value && (
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleReveal}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
              >
                {revealed ? "Hide" : "Reveal"}
              </button>
              <button
                onClick={onCopy}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${accentClass}`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>

        {value ? (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-gray-800 dark:text-gray-200 break-all select-all border border-gray-200 dark:border-slate-700">
            {revealed ? value : maskedValue}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-400 border border-gray-200 dark:border-slate-700">
            Click Generate to create one.
          </div>
        )}
      </div>

      {/* Timestamps */}
      {value && (createdAt || lastUsed) && (
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {createdAt && <span>Created {new Date(createdAt).toLocaleDateString()}</span>}
          {lastUsed && <span>· Last used {new Date(lastUsed).toLocaleDateString()}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
        >
          {regenerating && <Spinner className="text-white" />}
          {value ? regenerateLabel : generateLabel}
        </button>
        {value && (
          <button
            onClick={onRevoke}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 text-sm font-semibold rounded-xl border border-red-200 dark:border-red-800 transition-all"
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebhookPage() {
  const [waConnected, setWaConnected] = useState(false);
  const [waType, setWaType]           = useState<"qr" | "meta">("qr");
  const [waForceOpen, setWaForceOpen] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [data, setData]               = useState<KeyData | null>(null);

  // API key state
  const [apiRevealed, setApiRevealed]         = useState(false);
  const [apiCopied, setApiCopied]             = useState(false);
  const [apiRegenerating, setApiRegenerating] = useState(false);
  const [showRevokeApi, setShowRevokeApi]     = useState(false);
  const [revokingApi, setRevokingApi]         = useState(false);

  // Webhook state
  const [whRevealed, setWhRevealed]         = useState(false);
  const [whCopied, setWhCopied]             = useState(false);
  const [whRegenerating, setWhRegenerating] = useState(false);
  const [showRevokeWh, setShowRevokeWh]     = useState(false);
  const [revokingWh, setRevokingWh]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const wa = await apiGet<WAStatus>("/whatsapp/status");
      setWaConnected(wa.status === "connected");
      setWaType(wa.wa_type || "qr");
      if (wa.status === "connected") {
        const d = await apiGet<KeyData>("/api-keys");
        setData(d);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApiRegenerate = async () => {
    setApiRegenerating(true);
    try {
      const d = await apiPost<KeyData>("/api-keys/regenerate", {});
      setData(d);
      setApiRevealed(true);
    } catch {}
    finally { setApiRegenerating(false); }
  };

  const handleApiRevoke = async () => {
    setRevokingApi(true);
    try {
      await apiDelete("/api-keys");
      setData(null);
      setShowRevokeApi(false);
    } catch {}
    finally { setRevokingApi(false); }
  };

  const handleWhRegenerate = async () => {
    setWhRegenerating(true);
    try {
      const d = await apiPost<KeyData>("/api-keys/webhook/regenerate", {});
      setData((prev) =>
        prev
          ? { ...prev, webhook_token: d.webhook_token, webhook_last_used: d.webhook_last_used }
          : d
      );
      setWhRevealed(true);
    } catch {}
    finally { setWhRegenerating(false); }
  };

  const handleWhRevoke = async () => {
    setRevokingWh(true);
    try {
      await apiDelete("/api-keys/webhook");
      setData((prev) =>
        prev ? { ...prev, webhook_token: null, webhook_last_used: null } : null
      );
      setShowRevokeWh(false);
    } catch {}
    finally { setRevokingWh(false); }
  };

  const copyText = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const maskedApiKey = data?.key
    ? data.key.slice(0, 8) + "•".repeat(44)
    : "";
  const webhookUrl = data?.webhook_token
    ? `${backendUrl}/v1/webhook/${data.webhook_token}`
    : null;
  const maskedWebhookUrl = data?.webhook_token
    ? `${backendUrl}/v1/webhook/${data.webhook_token.slice(0, 14)}${"•".repeat(36)}`
    : "";

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-6 h-6 text-indigo-500" />
      </div>
    );
  }

  // ── WA Gate ──
  if (!waConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Connect WhatsApp first
          </h2>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            Webhooks and API keys send messages via your connected WhatsApp account.
          </p>
        </div>
        <button
          onClick={() => {
            setWaForceOpen(true);
            setTimeout(() => setWaForceOpen(false), 200);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all"
        >
          Connect WhatsApp
        </button>
        <WhatsAppStatusButton hideButton forceOpen={waForceOpen} onOpen={load} />
      </div>
    );
  }

  // ── Main Page ──
  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Webhook &amp; API
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Send WhatsApp messages from any platform. Click the{" "}
          <span className="font-semibold text-indigo-500">?</span> button for integration guides.
        </p>
      </div>

      {/* Webhook URL Card */}
      {waType === "meta" ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Webhook URL</p>
            <p className="text-xs text-gray-400 mt-0.5">For no-code tools — Zapier, Make, n8n.</p>
          </div>
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3.5">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Not available with Meta Business API
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 leading-relaxed">
                Webhook URLs work only with QR-connected accounts. Switch to QR connection to use this feature.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <KeyCard
          label="Webhook URL"
          description="For no-code tools — Zapier, Make, n8n. Token is embedded in the URL, no headers needed."
          accentClass="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
          value={webhookUrl}
          maskedValue={maskedWebhookUrl}
          revealed={whRevealed}
          onToggleReveal={() => setWhRevealed((v) => !v)}
          copied={whCopied}
          onCopy={() => copyText(webhookUrl || "", setWhCopied)}
          createdAt={data?.webhook_token ? data.created_at : null}
          lastUsed={data?.webhook_last_used}
          onRegenerate={handleWhRegenerate}
          regenerating={whRegenerating}
          onRevoke={() => setShowRevokeWh(true)}
          generateLabel="Generate Webhook"
          regenerateLabel="Regenerate"
        />
      )}

      {/* API Key Card */}
      <KeyCard
        label="API Key"
        description="For developers — Postman, custom code, or any HTTP client. Pass as X-API-Key header."
        accentClass="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
        value={data?.key || null}
        maskedValue={maskedApiKey}
        revealed={apiRevealed}
        onToggleReveal={() => setApiRevealed((v) => !v)}
        copied={apiCopied}
        onCopy={() => copyText(data?.key || "", setApiCopied)}
        createdAt={data?.created_at}
        lastUsed={data?.last_used}
        onRegenerate={handleApiRegenerate}
        regenerating={apiRegenerating}
        onRevoke={() => setShowRevokeApi(true)}
        generateLabel="Generate Key"
        regenerateLabel="Regenerate"
      />

      {/* Confirm: Revoke API Key */}
      <ConfirmModal
        open={showRevokeApi}
        title="Revoke API Key?"
        description="This will permanently delete your API key and webhook token. Any apps or automations using them will stop working immediately."
        confirmLabel="Yes, Revoke"
        loading={revokingApi}
        onConfirm={handleApiRevoke}
        onCancel={() => setShowRevokeApi(false)}
      />

      {/* Confirm: Revoke Webhook */}
      <ConfirmModal
        open={showRevokeWh}
        title="Revoke Webhook URL?"
        description="This will invalidate your current webhook URL. Any Zapier zaps or automations using it will stop receiving requests. Your API key will remain active."
        confirmLabel="Yes, Revoke"
        loading={revokingWh}
        onConfirm={handleWhRevoke}
        onCancel={() => setShowRevokeWh(false)}
      />

      {/* Floating docs button */}
      <DocsPopup
        backendUrl={backendUrl}
        apiKey={data?.key || null}
        webhookToken={data?.webhook_token || null}
      />
    </div>
  );
}
