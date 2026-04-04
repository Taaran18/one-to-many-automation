"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { apiGet, apiPost } from "@/lib/api";
import type { ChatContact, ChatMessage } from "@/lib/types";

/* ─── Helpers ──────────────────────────────────────────────────────────── */

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
    "from-orange-500 to-amber-600",
    "from-rose-500 to-pink-600",
    "from-sky-500 to-blue-600",
    "from-indigo-500 to-violet-600",
    "from-green-500 to-emerald-600",
    "from-yellow-500 to-orange-600",
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

/* Returns true if body is a direct outbound message stored with OUTBOUND prefix */
function isDirectOutbound(msg: ChatMessage): boolean {
  return msg.direction === "inbound" && msg.body.startsWith("__OUTBOUND__:");
}

function getDisplayBody(msg: ChatMessage): string {
  if (isDirectOutbound(msg)) {
    return msg.body.replace("__OUTBOUND__:", "");
  }
  return msg.body;
}

function getEffectiveDirection(msg: ChatMessage): "outbound" | "inbound" {
  return isDirectOutbound(msg) ? "outbound" : msg.direction;
}

/* ─── Status tick ──────────────────────────────────────────────────────── */
function StatusTick({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "failed")
    return <span className="text-red-400 text-xs ml-1">✕</span>;
  if (status === "delivered")
    return (
      <span className="text-blue-300 text-xs ml-1" title="Delivered">
        ✓✓
      </span>
    );
  // sent — show double tick (grey) like WhatsApp
  return (
    <span className="text-gray-400/80 text-xs ml-1" title="Sent">
      ✓✓
    </span>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────────── */
function EmptyInbox() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-600/20 flex items-center justify-center">
        <svg className="w-12 h-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">No chats yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
          Once you send a campaign message or receive a reply from a lead, their conversation will appear here.
        </p>
      </div>
    </div>
  );
}

/* ─── No contact selected state ─────────────────────────────────────────── */
function NoContactSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 bg-[#f0f2f5] dark:bg-[#0b141a]">
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/15 to-violet-600/15 dark:from-indigo-500/10 dark:to-violet-600/10 flex items-center justify-center">
          <svg className="w-16 h-16 text-indigo-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.214l4.297-1.376A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.25 0-4.348-.634-6.131-1.733l-.44-.262-2.551.818.832-2.487-.287-.468A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
        </div>
      </div>
      <div>
        <p className="text-xl font-semibold text-gray-600 dark:text-gray-300">OneToMany Chats</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-sm leading-relaxed">
          Select a conversation from the left to view messages. Your campaign messages and lead replies will all appear here.
        </p>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20">
        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-indigo-600 dark:text-indigo-400">End-to-end encrypted</p>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function ChatsPage() {
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchOpen, setChatSearchOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldForceScrollRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatSearchInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  /* ── Fetch contacts ── */
  const fetchContacts = useCallback(async () => {
    try {
      const data = await apiGet<ChatContact[]>("/chats/contacts");
      setContacts(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
    const interval = setInterval(fetchContacts, 5000);
    return () => clearInterval(interval);
  }, [fetchContacts]);

  /* ── Fetch messages for selected contact ── */
  const fetchMessages = useCallback(
    async (phone: string) => {
      try {
        const data = await apiGet<ChatMessage[]>(`/chats/messages/${encodeURIComponent(phone)}`);
        setMessages(data);
      } catch {
        /* silent */
      }
    },
    []
  );

  useEffect(() => {
    if (!selectedContact) return;
    setMsgLoading(true);
    fetchMessages(selectedContact.phone_no).finally(() => setMsgLoading(false));

    // Mark as read
    apiPost(`/chats/read/${encodeURIComponent(selectedContact.phone_no)}`, {}).catch(() => {});

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchMessages(selectedContact.phone_no);
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedContact, fetchMessages]);

  /* ── Auto-scroll ── */
  useEffect(() => {
    if (shouldForceScrollRef.current || isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    shouldForceScrollRef.current = false;
  }, [messages]);

  /* ── Select contact ── */
  const handleSelectContact = (contact: ChatContact) => {
    shouldForceScrollRef.current = true;
    setSelectedContact(contact);
    setMessages([]);
    setSendError(null);
    setMobileShowChat(true);
    setChatSearch("");
    setChatSearchOpen(false);
  };

  /* ── Send message ── */
  const handleSend = async () => {
    if (!selectedContact || !newMessage.trim() || sending) return;
    const body = newMessage.trim();
    setNewMessage("");
    setSending(true);
    setSendError(null);
    try {
      await apiPost("/chats/send", { phone_no: selectedContact.phone_no, body });
      shouldForceScrollRef.current = true;
      // Optimistic append
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          direction: "outbound",
          body,
          timestamp: new Date().toISOString(),
          status: "sent",
        } as ChatMessage,
      ]);
      setTimeout(() => fetchMessages(selectedContact.phone_no), 1000);
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
      // Re-populate input
      setNewMessage(body);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Filtered contacts ── */
  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone_no.includes(search)
  );

  /* ── Filter messages by chat search ── */
  const chatSearchLower = chatSearch.toLowerCase();
  const visibleMessages = chatSearch
    ? messages.filter((m) => getDisplayBody(m).toLowerCase().includes(chatSearchLower))
    : messages;

  /* ── Group messages by date ── */
  type MessageOrDivider = ChatMessage | { type: "divider"; date: string; key: string };
  const groupedMessages: MessageOrDivider[] = [];
  let lastDate = "";
  for (const msg of visibleMessages) {
    const day = msg.timestamp ? new Date(msg.timestamp).toDateString() : "";
    if (day && day !== lastDate) {
      groupedMessages.push({ type: "divider", date: formatSectionDate(msg.timestamp), key: `div-${day}` });
      lastDate = day;
    }
    groupedMessages.push(msg);
  }

  /* ─────────────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950">
      {/* ══ LEFT PANEL — Contact List ══════════════════════════════════════ */}
      <aside
        className={`${
          mobileShowChat ? "hidden lg:flex" : "flex"
        } flex-col w-full lg:w-[360px] xl:w-[380px] border-r border-gray-100 dark:border-gray-800/60 shrink-0 bg-white dark:bg-[#111b21]`}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3 bg-white dark:bg-[#202c33] border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Chats</h1>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="chat-search"
              type="text"
              placeholder="Search or start new chat"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-[#2a3942] text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border-0 focus:ring-2 focus:ring-indigo-400/50 outline-none transition-all"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyInbox />
          ) : (
            filtered.map((contact) => {
              const isActive = selectedContact?.phone_no === contact.phone_no;
              const initials = getInitials(contact.name);
              const avatarColor = getAvatarColor(contact.name);
              return (
                <button
                  key={contact.phone_no}
                  id={`contact-${contact.phone_no}`}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/40 transition-all text-left ${
                    isActive
                      ? "bg-indigo-50 dark:bg-[#2a3942]"
                      : "hover:bg-gray-50 dark:hover:bg-[#1e2b33]"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center shrink-0 shadow-sm`}>
                    <span className="text-sm font-bold text-white">{initials}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm font-semibold truncate ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-gray-900 dark:text-gray-100"}`}>
                        {contact.name}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 ml-2">
                        {formatDate(contact.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                        {contact.last_message
                          ? contact.last_message.startsWith("__OUTBOUND__:")
                            ? contact.last_message.replace("__OUTBOUND__:", "")
                            : contact.last_message
                          : contact.phone_no}
                      </p>
                      {contact.unread_count > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0 ml-1">
                          {contact.unread_count > 99 ? "99+" : contact.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ══ RIGHT PANEL — Chat Window ═══════════════════════════════════════ */}
      <main
        className={`${
          mobileShowChat ? "flex" : "hidden lg:flex"
        } flex-col flex-1 min-w-0`}
      >
        {!selectedContact ? (
          <NoContactSelected />
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#202c33] border-b border-gray-100 dark:border-gray-800/60 shadow-sm shrink-0">
              {/* Mobile back button */}
              <button
                className="lg:hidden w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setMobileShowChat(false)}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(selectedContact.name)} flex items-center justify-center shrink-0 shadow-sm`}>
                <span className="text-sm font-bold text-white">{getInitials(selectedContact.name)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{selectedContact.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{selectedContact.phone_no}</p>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setChatSearchOpen((o) => {
                      if (o) { setChatSearch(""); }
                      else { setTimeout(() => chatSearchInputRef.current?.focus(), 50); }
                      return !o;
                    });
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all ${chatSearchOpen ? "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                  title="Search in chat"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Chat search bar */}
            {chatSearchOpen && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#202c33] border-b border-gray-100 dark:border-gray-800/60">
                <svg className="w-4 h-4 text-gray-400 shrink-0 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={chatSearchInputRef}
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") { setChatSearch(""); setChatSearchOpen(false); } }}
                  placeholder="Search messages…"
                  className="flex-1 text-sm bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none"
                />
                {chatSearch && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                    {visibleMessages.length} result{visibleMessages.length !== 1 ? "s" : ""}
                  </span>
                )}
                <button
                  onClick={() => { setChatSearch(""); setChatSearchOpen(false); }}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Messages Area */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[#f0f2f5] dark:bg-[#0b141a]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(99,102,241,0.04) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            >

              {msgLoading ? (
                <div className="flex justify-center py-8">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              ) : groupedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {chatSearch ? `No messages matching "${chatSearch}"` : "No messages yet. Send the first one!"}
                  </p>
                </div>
              ) : (
                groupedMessages.map((item, idx) => {
                  if ("type" in item && item.type === "divider") {
                    return (
                      <div key={item.key} className="flex items-center justify-center my-4">
                        <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-[#182229]/80 text-xs text-gray-500 dark:text-gray-400 shadow-sm backdrop-blur-sm border border-white/60 dark:border-gray-700/40">
                          {item.date}
                        </span>
                      </div>
                    );
                  }

                  const msg = item as ChatMessage;
                  const dir = getEffectiveDirection(msg);
                  const body = getDisplayBody(msg);
                  const isOut = dir === "outbound";
                  const prevMsg = idx > 0 ? groupedMessages[idx - 1] : null;
                  const isFirst =
                    !prevMsg ||
                    "type" in prevMsg ||
                    getEffectiveDirection(prevMsg as ChatMessage) !== dir;

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOut ? "justify-end" : "justify-start"} ${isFirst ? "mt-3" : "mt-0.5"}`}
                    >
                      <div
                        className={`group relative max-w-[72%] lg:max-w-[58%] px-3 py-2 rounded-2xl shadow-sm transition-all ${
                          isOut
                            ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-800 dark:text-gray-100 rounded-br-sm"
                            : "bg-white dark:bg-[#202c33] text-gray-800 dark:text-gray-100 rounded-bl-sm"
                        }`}
                      >
                        {/* Campaign badge */}
                        {msg.campaign_name && (
                          <div className="flex items-center gap-1 mb-1.5">
                            <svg className="w-3 h-3 text-indigo-500 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                              {msg.campaign_name}
                            </span>
                          </div>
                        )}

                        {/* Message body */}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {body}
                        </p>

                        {/* Timestamp + status */}
                        <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-end" : "justify-end"}`}>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">
                            {formatTime(msg.timestamp)}
                          </span>
                          {isOut && <StatusTick status={msg.status} />}
                        </div>

                        {/* Tail */}
                        {isFirst && (
                          <div
                            className={`absolute top-0 w-2 h-2 ${
                              isOut
                                ? "right-[-6px] border-t-[8px] border-l-[8px] border-t-[#d9fdd3] dark:border-t-[#005c4b] border-l-transparent border-r-0"
                                : "left-[-6px] border-t-[8px] border-r-[8px] border-t-white dark:border-t-[#202c33] border-r-transparent border-l-0"
                            }`}
                            style={{ borderStyle: "solid" }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send Error */}
            {sendError && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800/30">
                <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {sendError}
                </p>
              </div>
            )}

            {/* Input Bar */}
            <div className="px-4 py-3 bg-white dark:bg-[#202c33] border-t border-gray-100 dark:border-gray-800/60 shrink-0">
              <div className="flex items-end gap-2">
                {/* Emoji button */}
                <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all shrink-0 mb-0.5" title="Emoji">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Text input */}
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    id="chat-message-input"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message"
                    rows={1}
                    disabled={sending}
                    className="w-full px-4 py-2.5 rounded-2xl bg-gray-100 dark:bg-[#2a3942] text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border-0 focus:ring-2 focus:ring-indigo-400/40 resize-none outline-none transition-all max-h-[120px] leading-relaxed disabled:opacity-60"
                    style={{ overflowY: "auto" }}
                  />
                </div>

                {/* Send button */}
                <button
                  id="chat-send-button"
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white disabled:text-gray-400 transition-all shrink-0 shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 mb-0.5"
                  title="Send"
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1.5 text-center">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
