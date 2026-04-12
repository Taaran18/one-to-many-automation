"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { EmailContact, EmailMessage, Lead } from "@/lib/types";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatTime(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return formatTime(ts);
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function formatSectionDate(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  const colors = [
    "from-violet-500 to-purple-600",
    "from-emerald-500 to-teal-600",
    "from-sky-500 to-blue-600",
    "from-rose-500 to-pink-600",
    "from-amber-500 to-orange-600",
    "from-indigo-500 to-blue-600",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}

/* ─── Group messages by date ───────────────────────────────────────────────── */

function groupByDate(messages: EmailMessage[]) {
  const groups: { date: string; messages: EmailMessage[] }[] = [];
  let lastDate = "";
  for (const m of messages) {
    const d = formatSectionDate(m.sent_at);
    if (d !== lastDate) {
      groups.push({ date: d, messages: [] });
      lastDate = d;
    }
    groups[groups.length - 1].messages.push(m);
  }
  return groups;
}

/* ─── Lead picker modal ────────────────────────────────────────────────────── */

function LeadPicker({
  onSelect,
  onClose,
}: {
  onSelect: (lead: Lead) => void;
  onClose: () => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiGet<Lead[]>("/leads")
      .then(setLeads)
      .catch(() => {})
      .finally(() => setLoading(false));
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const filtered = leads.filter((l) => {
    const q = query.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.email || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-sm font-bold text-gray-900 dark:text-white">New Mail — Select Lead</span>
          <button onClick={onClose} className="ml-auto w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5 border border-gray-200 dark:border-gray-700 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 transition-colors">
            <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
            />
          </div>
        </div>
        {/* Lead list */}
        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800 pb-2">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <svg className="w-5 h-5 animate-spin text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">
              {query ? "No leads match" : "No leads found"}
            </p>
          ) : (
            filtered.map((lead) => (
              <button
                key={lead.id}
                onClick={() => { if (lead.email) onSelect(lead); }}
                disabled={!lead.email}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                  lead.email
                    ? "hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(lead.name)} flex items-center justify-center shrink-0 shadow-sm`}>
                  <span className="text-xs font-bold text-white">{getInitials(lead.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{lead.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {lead.email || "No email address"}
                  </p>
                </div>
                {lead.email && (
                  <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Compose panel ────────────────────────────────────────────────────────── */

function ComposePanel({
  contact,
  onSent,
  autoOpen = false,
}: {
  contact: EmailContact;
  onSent: () => void;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);

  useEffect(() => {
    if (autoOpen) setOpen(true);
  }, [autoOpen]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    if (!subject.trim()) { setError("Subject is required"); return; }
    if (!body.trim())    { setError("Message body is required"); return; }
    setError("");
    setSending(true);
    try {
      await apiPost(`/email/compose/${contact.lead_id}`, {
        subject: subject.trim(),
        text: body.trim(),
      });
      setSubject("");
      setBody("");
      setOpen(false);
      onSent();
    } catch (err: any) {
      setError(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleDiscard = () => {
    setSubject("");
    setBody("");
    setError("");
    setOpen(false);
  };

  return (
    <div className="shrink-0 px-4 pb-4">
      {/* Collapsed bar */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-400 dark:text-gray-500 transition-all group"
        >
          <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="flex-1 text-left group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
            Compose a message to <span className="font-semibold text-gray-600 dark:text-gray-300">{contact.name}</span>…
          </span>
        </button>
      ) : (
        /* Expanded compose window */
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl shadow-black/10 overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 cursor-pointer select-none"
            onClick={() => setOpen(false)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                New Message
              </span>
              {subject && (
                <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                  — {subject}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Minimise */}
              <span className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </span>
              {/* Discard */}
              <span
                onClick={(e) => { e.stopPropagation(); handleDiscard(); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            </div>
          </div>

          {/* To row */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700/60">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 w-6">To</span>
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{contact.email}</span>
          </div>

          {/* Subject */}
          <div className="border-b border-gray-100 dark:border-gray-700/60">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-4 py-2.5 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
            />
          </div>

          {/* Body */}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message…"
            rows={5}
            className="w-full px-4 py-3 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none"
          />

          {/* Error */}
          {error && (
            <div className="mx-4 mb-2 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs px-3 py-2 rounded-lg">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between px-4 pb-3 pt-1">
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/25"
            >
              {sending ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" />
                </svg>
              )}
              Send
            </button>
            <button
              onClick={handleDiscard}
              className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── HTML iframe renderer ─────────────────────────────────────────────────── */

function HtmlFrame({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resize = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) iframe.style.height = doc.documentElement.scrollHeight + "px";
    } catch {}
  };
  return (
    <iframe
      ref={iframeRef}
      srcDoc={html}
      sandbox="allow-same-origin"
      onLoad={resize}
      className="w-full border-0"
      style={{ minHeight: 100 }}
      title="Email content"
    />
  );
}

/* ─── Full mail reading view ───────────────────────────────────────────────── */

function MailReadView({
  msg,
  contact,
  onBack,
}: {
  msg: EmailMessage;
  contact: EmailContact;
  onBack: () => void;
}) {
  const isCampaign = msg.campaign_name !== "__direct_mail__";
  const isFailed   = msg.status === "failed";

  const sentDate = msg.sent_at
    ? new Date(msg.sent_at).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
            {msg.subject || "(no subject)"}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isFailed && (
            <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
              FAILED
            </span>
          )}
          {isCampaign ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              Campaign
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
              Direct
            </span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Subject */}
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            {msg.subject || "(no subject)"}
          </h1>

          {/* Sender card */}
          <div className="flex items-start gap-3 mb-6 pb-5 border-b border-gray-100 dark:border-gray-800">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor("System")} flex items-center justify-center shrink-0 shadow-sm`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {isCampaign ? msg.campaign_name : "You (direct)"}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">→</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{contact.email}</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sentDate}</p>
            </div>
          </div>

          {/* Email content */}
          <div className="bg-white dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            {msg.html ? (
              <HtmlFrame html={msg.html} />
            ) : (
              <p className="px-6 py-5 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {msg.text || "(empty)"}
              </p>
            )}
          </div>

          {/* Error */}
          {isFailed && msg.error_message && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>Delivery failed: {msg.error_message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Email row (in thread list) ───────────────────────────────────────────── */

function EmailBubble({ msg, onOpen }: { msg: EmailMessage; onOpen: () => void }) {
  const isFailed   = msg.status === "failed";
  const isCampaign = msg.campaign_name !== "__direct_mail__";

  return (
    <button
      onClick={onOpen}
      className={`w-full text-left rounded-2xl border transition-all px-4 py-3.5 hover:shadow-sm ${
        isFailed
          ? "border-red-200 dark:border-red-800/50 bg-red-50/40 dark:bg-red-900/10 hover:border-red-300"
          : isCampaign
          ? "border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-900/10 hover:border-indigo-300 dark:hover:border-indigo-700"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Type dot */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${isCampaign ? "bg-indigo-400" : "bg-emerald-400"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {msg.subject || "(no subject)"}
            </span>
            {isFailed && (
              <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-500 px-1.5 py-0.5 rounded-full">
                FAILED
              </span>
            )}
            {isCampaign && (
              <span className="text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                {msg.campaign_name}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {msg.text || "(no preview)"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatTime(msg.sent_at)}</span>
          <svg className="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

/* ─── Main page ────────────────────────────────────────────────────────────── */

type ThreadTab = "all" | "campaign" | "direct";

export default function MailPage() {
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmailContact | null>(null);
  const [thread, setThread] = useState<EmailMessage[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadTab, setThreadTab] = useState<ThreadTab>("all");
  const [showPicker, setShowPicker] = useState(false);
  const [autoOpenCompose, setAutoOpenCompose] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<EmailMessage | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; leadId: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [archivedIds, setArchivedIds] = useState<Set<number>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  /* Load contacts */
  const loadContacts = useCallback(async () => {
    try {
      const data = await apiGet<EmailContact[]>("/email/contacts");
      setContacts(data);
    } catch {}
    setLoadingContacts(false);
  }, []);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  /* Load thread when contact selected */
  const loadThread = useCallback(async (contact: EmailContact) => {
    setLoadingThread(true);
    try {
      const data = await apiGet<EmailMessage[]>(`/email/thread/${contact.lead_id}`);
      setThread(data);
    } catch {
      setThread([]);
    }
    setLoadingThread(false);
  }, []);

  useEffect(() => {
    if (selected) {
      setThreadTab("all");
      setSelectedMsg(null);
      loadThread(selected);
    }
  }, [selected, loadThread]);

  /* Scroll to bottom when thread updates */
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  const handleSent = async () => {
    if (selected) {
      await loadThread(selected);
      await loadContacts();
    }
  };

  const handlePickLead = (lead: Lead) => {
    setShowPicker(false);
    const contact: EmailContact = {
      lead_id: lead.id,
      name: lead.name,
      email: lead.email || "",
      last_subject: "",
      last_snippet: "",
    };
    setSelected(contact);
    setContacts((prev) =>
      prev.some((c) => c.lead_id === lead.id) ? prev : [contact, ...prev]
    );
    // Auto-open the compose window after picking
    setAutoOpenCompose(true);
    setTimeout(() => setAutoOpenCompose(false), 100);
  };

  /* ── Context menu ── */
  const handleContextMenu = (e: React.MouseEvent, leadId: number) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, leadId });
  };

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [ctxMenu]);

  /* ── Archive / Unarchive ── */
  const handleArchive = (leadId: number) => {
    setCtxMenu(null);
    setArchivedIds((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
      return next;
    });
    if (selected?.lead_id === leadId) {
      setSelected(null);
      setThread([]);
      setSelectedMsg(null);
    }
  };

  /* ── Delete all email history for this contact ── */
  const handleDelete = async (leadId: number) => {
    setDeleteConfirm(null);
    try {
      await apiDelete(`/email/contact/${leadId}`);
      setContacts((prev) => prev.filter((c) => c.lead_id !== leadId));
      if (selected?.lead_id === leadId) {
        setSelected(null);
        setThread([]);
        setSelectedMsg(null);
      }
    } catch { /* silent */ }
  };

  const filteredContacts = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    const isArchived = archivedIds.has(c.lead_id);
    return matchesSearch && (showArchived ? isArchived : !isArchived);
  });

  const campaignMails = thread.filter((m) => m.campaign_name !== "__direct_mail__");
  const directMails   = thread.filter((m) => m.campaign_name === "__direct_mail__");
  const visibleThread =
    threadTab === "campaign" ? campaignMails :
    threadTab === "direct"   ? directMails :
    thread;

  const groups = groupByDate(visibleThread);

  return (
    <div className="h-full flex flex-col overflow-hidden px-4 sm:px-6 lg:px-8 py-4 gap-2">
      {/* Page title bar */}
      <div className="shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">Mail</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 hidden sm:block">
          Email history &amp; compose
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 flex min-h-0 gap-4">

        {/* ── Left: Contact list ── */}
        <div className="w-72 shrink-0 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600">
              {showArchived ? "Archived" : "Contacts"}
            </span>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {filteredContacts.length}
            </span>
          </div>

          {/* Search */}
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts…"
                className="flex-1 text-sm bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60 min-h-0">
            {loadingContacts ? (
              <div className="flex justify-center items-center h-32">
                <svg className="w-5 h-5 animate-spin text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                <svg className="w-8 h-8 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {search ? "No matches" : "No email contacts yet"}
                </p>
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isActive = selected?.lead_id === c.lead_id;
                return (
                  <button
                    key={c.lead_id}
                    onClick={() => setSelected(c)}
                    onContextMenu={(e) => handleContextMenu(e, c.lead_id)}
                    className={`w-full text-left px-4 py-3.5 transition-all flex items-start gap-3 ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(c.name)} flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      <span className="text-xs font-bold text-white">{getInitials(c.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-semibold truncate ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-white"}`}>
                          {c.name}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                          {formatDate(c.last_message_at)}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isActive ? "text-indigo-500 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
                        {c.last_subject || c.email}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom action bar */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-t border-gray-100 dark:border-gray-800/60">
            {/* Left: Archive toggle */}
            {showArchived ? (
              <button
                onClick={() => { setShowArchived(false); setSelected(null); setThread([]); setSelectedMsg(null); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
            ) : (
              <button
                onClick={() => { setShowArchived(true); setSelected(null); setThread([]); setSelectedMsg(null); }}
                title="View archived contacts"
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 px-3 py-2 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
                </svg>
                Archived
                {archivedIds.size > 0 && (
                  <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {archivedIds.size}
                  </span>
                )}
              </button>
            )}

            {/* Right: Compose */}
            <button
              onClick={() => setShowPicker(true)}
              title="Compose new mail"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-500/30 active:scale-[.97]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Compose
            </button>
          </div>
        </div>

        {/* ── Right: Thread + Compose ── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Select a contact</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Choose a contact to view their email history and send messages
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Thread header — hidden when reading a specific email */}
              {!selectedMsg && <div className="shrink-0 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                {/* Contact row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(selected.name)} flex items-center justify-center shadow-sm`}>
                    <span className="text-xs font-bold text-white">{getInitials(selected.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selected.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{selected.email}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                    {thread.length} email{thread.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Tab switcher */}
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                  {([
                    { key: "all",      label: "All",            count: thread.length },
                    { key: "campaign", label: "Campaign Mails", count: campaignMails.length },
                    { key: "direct",   label: "Direct Mails",   count: directMails.length },
                  ] as { key: ThreadTab; label: string; count: number }[]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setThreadTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        threadTab === tab.key
                          ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {tab.key === "campaign" && (
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                      )}
                      {tab.key === "direct" && (
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      )}
                      {tab.label}
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        threadTab === tab.key
                          ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>}

              {selectedMsg ? (
                /* ── Full mail reading view ── */
                <MailReadView
                  msg={selectedMsg}
                  contact={selected}
                  onBack={() => setSelectedMsg(null)}
                />
              ) : (
                <>
                  {/* Thread list */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                    {loadingThread ? (
                      <div className="flex justify-center items-center h-32">
                        <svg className="w-5 h-5 animate-spin text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    ) : visibleThread.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 gap-2 text-center">
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                          {threadTab === "campaign" ? "No campaign emails yet" :
                           threadTab === "direct"   ? "No direct emails yet" :
                           "No emails yet"}
                        </p>
                        {threadTab !== "campaign" && (
                          <p className="text-xs text-gray-300 dark:text-gray-600">Send the first email below</p>
                        )}
                      </div>
                    ) : (
                      groups.map((g) => (
                        <div key={g.date}>
                          <div className="flex items-center gap-3 mb-2 mt-1">
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide shrink-0">
                              {g.date}
                            </span>
                            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                          </div>
                          <div className="space-y-2">
                            {g.messages.map((msg) => (
                              <EmailBubble key={msg.id} msg={msg} onOpen={() => setSelectedMsg(msg)} />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={threadEndRef} />
                  </div>

                  {/* Compose */}
                  <ComposePanel contact={selected} onSent={handleSent} autoOpen={autoOpenCompose} />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Right-click context menu ── */}
      {ctxMenu && (() => {
        const isArchived = archivedIds.has(ctxMenu.leadId);
        return (
          <div
            className="fixed z-50 w-48 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden py-1"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Archive / Unarchive */}
            <button
              onClick={() => handleArchive(ctxMenu.leadId)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
              <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12" />
              </svg>
              {isArchived ? "Unarchive" : "Archive contact"}
            </button>
            <div className="h-px bg-gray-100 dark:bg-gray-700 mx-3 my-1" />
            {/* Delete */}
            <button
              onClick={() => { setCtxMenu(null); setDeleteConfirm(ctxMenu.leadId); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete mail history
            </button>
          </div>
        );
      })()}

      {/* ── Delete confirm modal ── */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">Delete mail history</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              All email history with{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {contacts.find(c => c.lead_id === deleteConfirm)?.name || "this contact"}
              </span>{" "}
              will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-semibold text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead picker modal */}
      {showPicker && (
        <LeadPicker
          onSelect={handlePickLead}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
