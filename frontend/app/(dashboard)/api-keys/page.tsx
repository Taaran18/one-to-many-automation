"use client";

import { useState, useEffect, useCallback } from "react";
import WhatsAppStatusButton from "@/components/layout/WhatsAppStatusButton";
import Spinner from "@/components/ui/Spinner";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface ApiKeyData {
  key: string;
  created_at: string;
  last_used: string | null;
}

interface WAStatus {
  status: string;
}

export default function ApiKeysPage() {
  const [waConnected, setWaConnected]   = useState(false);
  const [waForceOpen, setWaForceOpen]   = useState(false);
  const [loading, setLoading]           = useState(true);
  const [apiKey, setApiKey]             = useState<ApiKeyData | null>(null);
  const [revealed, setRevealed]         = useState(false);
  const [copied, setCopied]             = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [revoking, setRevoking]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [wa] = await Promise.all([
        apiGet<WAStatus>("/whatsapp/status"),
      ]);
      setWaConnected(wa.status === "connected");
      if (wa.status === "connected") {
        const key = await apiGet<ApiKeyData>("/api-keys");
        setApiKey(key);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const key = await apiPost<ApiKeyData>("/api-keys/regenerate", {});
      setApiKey(key);
      setRevealed(true);
    } catch {}
    finally { setRegenerating(false); }
  };

  const handleRevoke = async () => {
    if (!confirm("Revoke this API key? Any apps using it will stop working.")) return;
    setRevoking(true);
    try {
      await apiDelete("/api-keys");
      setApiKey(null);
    } catch {}
    finally { setRevoking(false); }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const maskedKey = apiKey ? apiKey.key.slice(0, 8) + "••••••••••••••••••••••••••••••••••••••••••••••••" : "";
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-6 h-6 text-indigo-500" />
      </div>
    );
  }

  if (!waConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-28 gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Connect WhatsApp first</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">Your API key sends messages via your connected WhatsApp account.</p>
        </div>
        <button
          onClick={() => { setWaForceOpen(true); setTimeout(() => setWaForceOpen(false), 200); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-all"
        >
          Connect WhatsApp
        </button>
        <WhatsAppStatusButton hideButton forceOpen={waForceOpen} onOpen={load} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">API Access</h1>
        <p className="text-sm text-gray-400 mt-0.5">Send WhatsApp messages from Postman, your app, or any HTTP client.</p>
      </div>

      {/* Key card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your API Key</p>
          <div className="flex items-center gap-2">
            {apiKey && (
              <>
                <button
                  onClick={() => setRevealed(v => !v)}
                  className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
                >
                  {revealed ? "Hide" : "Reveal"}
                </button>
                <button
                  onClick={() => handleCopy(apiKey.key)}
                  className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-lg font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </>
            )}
          </div>
        </div>

        {apiKey ? (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 font-mono text-sm text-gray-800 dark:text-gray-200 break-all select-all border border-gray-200 dark:border-slate-700">
            {revealed ? apiKey.key : maskedKey}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-sm text-gray-400 border border-gray-200 dark:border-slate-700">
            No API key — click Generate to create one.
          </div>
        )}

        {apiKey && (
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>Created {new Date(apiKey.created_at).toLocaleDateString()}</span>
            {apiKey.last_used && <span>· Last used {new Date(apiKey.last_used).toLocaleDateString()}</span>}
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
          >
            {regenerating ? <Spinner className="text-white" /> : null}
            {apiKey ? "Regenerate" : "Generate Key"}
          </button>
          {apiKey && (
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 text-sm font-semibold rounded-xl border border-red-200 dark:border-red-800 transition-all disabled:opacity-50"
            >
              {revoking ? <Spinner className="text-red-500" /> : "Revoke"}
            </button>
          )}
        </div>
      </div>

      {/* Usage */}
      {apiKey && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">How to use</p>

          <div className="space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Send a <span className="font-semibold text-gray-700 dark:text-gray-300">POST</span> request to:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-sm text-indigo-600 dark:text-indigo-400 font-mono border border-gray-200 dark:border-slate-700 break-all">
                {backendUrl}/v1/send
              </code>
              <button
                onClick={() => handleCopy(`${backendUrl}/v1/send`)}
                className="shrink-0 text-xs bg-gray-100 dark:bg-slate-800 text-gray-500 px-2.5 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Headers */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Headers</p>
            <div className="rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden text-xs font-mono">
              {[
                { key: "Content-Type", value: "application/json" },
                { key: "X-API-Key", value: revealed ? apiKey.key : maskedKey },
              ].map(row => (
                <div key={row.key} className="flex border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                  <span className="w-36 shrink-0 px-4 py-2.5 bg-gray-50 dark:bg-slate-800/50 text-gray-500 border-r border-gray-100 dark:border-gray-800">{row.key}</span>
                  <span className="px-4 py-2.5 text-gray-700 dark:text-gray-300 break-all">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Body (JSON)</p>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-mono border border-gray-200 dark:border-slate-700 overflow-auto">{`{
  "phone": "+919876543210",
  "message": "Hello from OneToMany API!"
}`}</pre>
          </div>

          {/* Response */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Response</p>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 font-mono border border-gray-200 dark:border-slate-700">{`{ "success": true }`}</pre>
          </div>

          {/* cURL example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">cURL example</p>
              <button
                onClick={() => handleCopy(`curl -X POST ${backendUrl}/v1/send \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: ${apiKey.key}" \\\n  -d '{"phone":"+919876543210","message":"Hello!"}'`)}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold"
              >
                Copy
              </button>
            </div>
            <pre className="bg-gray-50 dark:bg-slate-800 rounded-xl px-4 py-3 text-xs text-gray-700 dark:text-gray-300 font-mono border border-gray-200 dark:border-slate-700 overflow-auto whitespace-pre-wrap">{`curl -X POST ${backendUrl}/v1/send \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${revealed ? apiKey.key : maskedKey}" \\
  -d '{"phone":"+919876543210","message":"Hello!"}'`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
