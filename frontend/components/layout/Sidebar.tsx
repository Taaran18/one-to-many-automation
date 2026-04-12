"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import WhatsAppStatusButton from "./WhatsAppStatusButton";
import EmailStatusButton from "./EmailStatusButton";
import AccountModal from "./AccountModal";
import { apiGet } from "@/lib/api";
import type { WAStatus } from "@/lib/types";

interface UserProfile {
  email: string | null;
  full_name: string | null;
}

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        className="w-[18px] h-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    icon: (
      <svg
        className="w-[18px] h-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
        />
      </svg>
    ),
  },
  {
    href: "/leads",
    label: "Leads",
    icon: (
      <svg
        className="w-[18px] h-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    href: "/templates",
    label: "Templates",
    icon: (
      <svg
        className="w-[18px] h-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    ),
  },
  {
    href: "/chats",
    label: "Chats",
    icon: (
      <svg
        className="w-[18px] h-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
        />
      </svg>
    ),
  },
  {
    href: "/mail",
    label: "Mail",
    icon: (
      <svg
        className="w-[18px] h-[18px] shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    ),
  },
];

export default function Sidebar({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [accountOpen, setAccountOpen]   = useState(false);
  const [waForceOpen, setWaForceOpen]   = useState(false);
  const [unreadChats, setUnreadChats]   = useState(0);

  useEffect(() => {
    apiGet<UserProfile>("/profile").then(setProfile).catch(() => {});
  }, []);

  const displayName = profile?.full_name || profile?.email || "User";
  const initial     = displayName[0].toUpperCase();

  useEffect(() => {
    // Only show once per browser session
    if (sessionStorage.getItem("wa_onboard_shown")) return;
    (async () => {
      try {
        const s = await apiGet<WAStatus>("/whatsapp/status");
        if (s.status === "disconnected") {
          sessionStorage.setItem("wa_onboard_shown", "1");
          setWaForceOpen(true);
          setTimeout(() => setWaForceOpen(false), 200);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const data = await apiGet<{ unread_count: number }>("/chats/unread_count");
        setUnreadChats(data.unread_count);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    document.cookie = "access_token=; path=/; max-age=0";
    router.push("/login");
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full w-64 flex flex-col z-30 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-800/60 transition-transform duration-200 ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
          <svg
            className="w-5 h-5 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.214l4.297-1.376A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.25 0-4.348-.634-6.131-1.733l-.44-.262-2.551.818.832-2.487-.287-.468A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">
            OneToMany
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            WhatsApp Automation
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-600 px-3 mb-3">
          Main Menu
        </p>

        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/70 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <span
                className={
                  active
                    ? "text-white"
                    : "text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors"
                }
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/chats" && unreadChats > 0 && !active && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadChats > 99 ? "99+" : unreadChats}
                </span>
              )}
              {active && (
                <svg
                  className="w-3.5 h-3.5 text-white/70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100 dark:border-gray-800/60" />

      {/* Email + WhatsApp status */}
      <div className="px-3 pt-3 space-y-2">
        <EmailStatusButton compact />
        <WhatsAppStatusButton
          compact
          onOpen={onMobileClose}
          forceOpen={waForceOpen}
        />
      </div>

      {/* User row */}
      <div className="p-3 pt-2">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
          {/* Clickable avatar + name */}
          <button
            onClick={() => setAccountOpen(true)}
            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs font-bold text-white">{initial}</span>
            </div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 truncate">
              {displayName}
            </p>
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <AccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onProfileUpdate={(p) => setProfile({ email: p.email, full_name: p.full_name })}
      />
    </aside>
  );
}
