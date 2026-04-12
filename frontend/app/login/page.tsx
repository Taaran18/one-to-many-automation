"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Country codes ──────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+91",  flag: "🇮🇳", name: "India",          digits: 10 },
  { code: "+1",   flag: "🇺🇸", name: "United States",  digits: 10 },
  { code: "+44",  flag: "🇬🇧", name: "United Kingdom", digits: 10 },
  { code: "+61",  flag: "🇦🇺", name: "Australia",      digits: 9  },
  { code: "+971", flag: "🇦🇪", name: "UAE",            digits: 9  },
  { code: "+65",  flag: "🇸🇬", name: "Singapore",      digits: 8  },
  { code: "+60",  flag: "🇲🇾", name: "Malaysia",       digits: 9  },
  { code: "+62",  flag: "🇮🇩", name: "Indonesia",      digits: 10 },
  { code: "+63",  flag: "🇵🇭", name: "Philippines",    digits: 10 },
  { code: "+66",  flag: "🇹🇭", name: "Thailand",       digits: 9  },
  { code: "+84",  flag: "🇻🇳", name: "Vietnam",        digits: 9  },
  { code: "+86",  flag: "🇨🇳", name: "China",          digits: 11 },
  { code: "+82",  flag: "🇰🇷", name: "South Korea",    digits: 10 },
  { code: "+81",  flag: "🇯🇵", name: "Japan",          digits: 10 },
  { code: "+92",  flag: "🇵🇰", name: "Pakistan",       digits: 10 },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh",     digits: 10 },
  { code: "+94",  flag: "🇱🇰", name: "Sri Lanka",      digits: 9  },
  { code: "+977", flag: "🇳🇵", name: "Nepal",          digits: 10 },
  { code: "+27",  flag: "🇿🇦", name: "South Africa",   digits: 9  },
  { code: "+234", flag: "🇳🇬", name: "Nigeria",        digits: 10 },
  { code: "+254", flag: "🇰🇪", name: "Kenya",          digits: 9  },
  { code: "+49",  flag: "🇩🇪", name: "Germany",        digits: 11 },
  { code: "+33",  flag: "🇫🇷", name: "France",         digits: 9  },
  { code: "+39",  flag: "🇮🇹", name: "Italy",          digits: 10 },
  { code: "+34",  flag: "🇪🇸", name: "Spain",          digits: 9  },
  { code: "+55",  flag: "🇧🇷", name: "Brazil",         digits: 11 },
  { code: "+52",  flag: "🇲🇽", name: "Mexico",         digits: 10 },
];

// ── Flag + country picker ─────────────────────────────────────────────────────
function FlagSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref               = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);
  const selected          = COUNTRY_CODES.find(c => c.code === value) ?? COUNTRY_CODES[0];

  const filtered = query
    ? COUNTRY_CODES.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.includes(query)
      )
    : COUNTRY_CODES;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen(!open)}
        className="h-12 flex items-center gap-1.5 px-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-sm font-semibold text-gray-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-all hover:bg-gray-100 dark:hover:bg-slate-700 w-[96px]">
        <span className="text-xl leading-none">{selected.flag}</span>
        <span className="text-gray-600 dark:text-slate-300 text-xs">{selected.code}</span>
        <svg className={`w-3 h-3 text-gray-400 ml-auto transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-slate-700">
            <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search country…"
              className="w-full h-9 bg-gray-50 dark:bg-slate-700 rounded-xl px-3 text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          {/* List */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400 dark:text-slate-500">No results</p>
            ) : filtered.map(c => (
              <button key={c.code} type="button"
                onClick={() => { onChange(c.code); setOpen(false); setQuery(""); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${value === c.code ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-gray-700 dark:text-slate-300"}`}>
                <span className="text-xl leading-none">{c.flag}</span>
                <span className="flex-1 text-left text-xs">{c.name}</span>
                <span className="text-gray-400 dark:text-slate-500 text-xs font-semibold">{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const COMPANY_TYPES = [
  "E-commerce", "Real Estate", "Healthcare", "Education",
  "Finance & Banking", "Retail", "Agency / Marketing",
  "SaaS / Technology", "Hospitality", "Logistics", "Other",
];

const PLANS = [
  {
    id: "free",
    name: "Starter",
    price: "Free",
    sub: "Forever free",
    desc: "Perfect for small teams getting started with WhatsApp automation.",
    highlight: false,
    badge: null as string | null,
    comingSoon: false,
    features: [
      "100 messages / month",
      "1 active campaign",
      "Up to 50 leads",
      "Basic message templates",
      "QR code connection",
      "Email support",
    ],
    cta: "Get Started Free",
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹999",
    sub: "per month",
    desc: "For growing businesses that need more reach and automation power.",
    highlight: true,
    badge: "Most Popular" as string | null,
    comingSoon: true,
    features: [
      "10,000 messages / month",
      "Unlimited campaigns",
      "5,000 leads",
      "Advanced templates + variables",
      "QR + Meta Business API",
      "Campaign scheduling",
      "Analytics dashboard",
      "Priority support",
    ],
    cta: "Coming Soon",
  },
  {
    id: "business",
    name: "Business",
    price: "₹2,999",
    sub: "per month",
    desc: "Enterprise-grade automation for high-volume senders.",
    highlight: false,
    badge: null as string | null,
    comingSoon: true,
    features: [
      "Unlimited messages",
      "Unlimited campaigns",
      "Unlimited leads",
      "Custom templates",
      "Meta Business API",
      "Recurring campaigns",
      "Advanced analytics",
      "Dedicated support",
    ],
    cta: "Coming Soon",
  },
];

const FEATURES = [
  { icon: "💬", text: "Bulk WhatsApp campaigns to thousands of leads" },
  { icon: "🗓️", text: "Smart scheduling with daily, weekly & monthly recurrence" },
  { icon: "📊", text: "Real-time analytics and delivery tracking" },
  { icon: "📥", text: "Two-way chat inbox for inbound replies" },
];

function FadeSlide({ children, id }: { children: React.ReactNode; id: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [id]);
  return (
    <div style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(8px)", transition: "opacity 0.25s ease, transform 0.25s ease" }}>
      {children}
    </div>
  );
}

function CheckIcon({ highlight }: { highlight: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 ${highlight ? "text-indigo-200" : "text-indigo-500 dark:text-indigo-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function LoginPage() {
  const [isLogin,   setIsLogin]   = useState(true);
  const [step,      setStep]      = useState<"details" | "plans">("details");

  // Login fields
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);

  // Signup extra fields
  const [fullName,     setFullName]     = useState("");
  const [phone,        setPhone]        = useState("");
  const [countryCode,  setCountryCode]  = useState("+91");
  const [companyName,  setCompanyName]  = useState("");
  const [companyType,  setCompanyType]  = useState("");

  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const reset = () => {
    setEmail(""); setPassword(""); setError(""); setSuccess("");
    setFullName(""); setPhone(""); setCountryCode("+91"); setCompanyName(""); setCompanyType("");
    setStep("details");
  };
  const switchMode = (login: boolean) => { setIsLogin(login); reset(); };

  // ── Login submit ─────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Login failed"); }
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      document.cookie = `access_token=${data.access_token}; path=/; max-age=28800; SameSite=Lax`;
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 1: validate details → go to plans ───────────────────────────────────
  const handleDetailsNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim())          { setError("Full name is required."); return; }
    if (!email.includes("@"))      { setError("Enter a valid email address."); return; }
    if (password.length < 6)       { setError("Password must be at least 6 characters."); return; }
    const countryMeta = COUNTRY_CODES.find(c => c.code === countryCode);
    const requiredDigits = countryMeta?.digits ?? 10;
    const digitsOnly = phone.replace(/\D/g, "");
    if (!digitsOnly)                         { setError("Phone number is required."); return; }
    if (digitsOnly.length !== requiredDigits) { setError(`Phone number must be exactly ${requiredDigits} digits for ${countryMeta?.name ?? "this country"}.`); return; }
    if (!companyName.trim())       { setError("Company name is required."); return; }
    if (!companyType)              { setError("Please select a company type."); return; }
    setStep("plans");
  };

  // ── Step 2: select plan → register ───────────────────────────────────────────
  const handleSelectPlan = async (planId: string) => {
    setError(""); setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, password,
          phone_no: `${countryCode}${phone}`,
          full_name: fullName,
          company_name: companyName,
          company_type: companyType,
          plan: planId,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Registration failed"); }
      setIsLogin(true); reset();
      setSuccess("Account created! You can now sign in.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("details");
    } finally {
      setIsLoading(false);
    }
  };

  const inputCls = "w-full h-12 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";

  // ── Plans step — full-width layout ───────────────────────────────────────────
  if (!isLogin && step === "plans") {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 lg:px-10 border-b border-gray-100 dark:border-slate-800">
          <button
            onClick={() => setStep("details")}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="OneToMany" width={30} height={30} className="rounded-lg" />
            <span className="font-bold text-gray-900 dark:text-white text-sm">OneToMany</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <FadeSlide id="plans">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                Step 2 of 2
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                Choose your plan
              </h1>
              <p className="mt-3 text-gray-500 dark:text-slate-400 text-base">
                Start free, upgrade when you&apos;re ready. No credit card required for Starter.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium mb-8 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 max-w-md mx-auto">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full items-start">
              {PLANS.map(plan => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-7 flex flex-col transition-all ${
                    plan.highlight
                      ? "bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30 md:-mt-4 md:mb-4"
                      : "bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-4 py-1.5 rounded-full whitespace-nowrap shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div className={`text-xs font-bold uppercase tracking-widest ${plan.highlight ? "text-indigo-200" : "text-indigo-600 dark:text-indigo-400"}`}>
                    {plan.name}
                  </div>

                  <div className="mt-3 flex items-end gap-1">
                    <span className={`text-4xl font-extrabold leading-none ${plan.highlight ? "text-white" : "text-slate-900 dark:text-white"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-sm mb-1 ${plan.highlight ? "text-indigo-200" : "text-slate-500 dark:text-slate-400"}`}>
                      {plan.sub}
                    </span>
                  </div>

                  <p className={`mt-3 text-sm leading-relaxed ${plan.highlight ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>
                    {plan.desc}
                  </p>

                  <ul className="mt-6 space-y-3 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <CheckIcon highlight={plan.highlight} />
                        <span className={plan.highlight ? "text-indigo-50" : "text-slate-600 dark:text-slate-300"}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {plan.comingSoon ? (
                    <div className={`mt-7 block text-center py-3 rounded-xl font-semibold text-sm ${
                      plan.highlight
                        ? "bg-white/20 text-white/60 cursor-not-allowed"
                        : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                    }`}>
                      Coming Soon
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isLoading}
                      className={`mt-7 w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                        plan.highlight
                          ? "bg-white text-indigo-600 hover:bg-indigo-50"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {isLoading ? (
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : null}
                      {plan.cta}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-8">
              Already have an account?{" "}
              <button onClick={() => { switchMode(true); }} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                Sign in
              </button>
            </p>
          </FadeSlide>
        </div>
      </div>
    );
  }

  // ── Login / Signup details — two-panel layout ────────────────────────────────
  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL — branding */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[44%] flex-shrink-0 flex-col bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
        </div>

        <div className="relative z-10 p-10">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="OneToMany" width={38} height={38} className="rounded-xl" />
            <span className="font-bold text-xl text-white">OneToMany</span>
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center px-10 xl:px-14 pb-10">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full mb-6 w-fit">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Trusted by 500+ businesses
          </div>
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4">
            Automate your WhatsApp outreach at scale
          </h2>
          <p className="text-indigo-100 text-base leading-relaxed mb-10">
            Send thousands of personalised messages, manage campaigns, and grow your business — all from one dashboard.
          </p>
          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base flex-shrink-0">
                  {f.icon}
                </span>
                <span className="text-indigo-100 text-sm leading-relaxed pt-1">{f.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mx-10 xl:mx-14 mb-10 bg-white/10 border border-white/15 rounded-2xl p-5">
          <div className="flex gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-white/90 text-sm leading-relaxed">
            &ldquo;OneToMany doubled our sales outreach in three months. The campaign scheduler alone saves us 20 hours a week.&rdquo;
          </p>
          <div className="mt-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-400 flex items-center justify-center text-white text-xs font-bold">PS</div>
            <div>
              <div className="text-white text-xs font-semibold">Priya Sharma</div>
              <div className="text-indigo-300 text-xs">Founder, StyleKart</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex-1 flex flex-col min-h-screen bg-white dark:bg-slate-950 relative">
        <div className="lg:hidden absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-950 dark:via-indigo-950 dark:to-slate-950 pointer-events-none" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/" className="hidden lg:flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <Image src="/logo.png" alt="OneToMany" width={30} height={30} className="rounded-lg" />
            <span className="font-bold text-white text-sm">OneToMany</span>
          </Link>
          <div className="lg:bg-gray-100 lg:dark:bg-slate-800 rounded-xl p-0.5 [&_button]:lg:text-slate-500 [&_button]:lg:hover:text-indigo-600 [&_button]:lg:dark:text-slate-400 [&_button]:text-white/70 [&_button]:hover:text-white [&_button]:hover:bg-white/10 [&_button]:lg:hover:bg-indigo-50 [&_button]:lg:dark:hover:bg-slate-700">
            <ThemeToggle />
          </div>
        </div>

        {/* Form area */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
          <div className="w-full max-w-[420px]">
            <div className="bg-white dark:bg-slate-900 lg:bg-transparent lg:dark:bg-transparent rounded-3xl lg:rounded-none shadow-2xl shadow-black/30 lg:shadow-none overflow-hidden lg:overflow-visible">
              <div className="h-1 lg:h-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

              <div className="px-8 py-8 lg:px-0 lg:py-0">

                {/* Heading */}
                <FadeSlide id={isLogin ? "login" : "signup"}>
                  <div className="mb-6">
                    {!isLogin && (
                      <div className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-3">
                        Step 1 of 2 — Account Details
                      </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {isLogin ? "Welcome back" : "Create your account"}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {isLogin ? "Sign in to your OneToMany dashboard" : "Tell us a bit about yourself and your company"}
                    </p>
                  </div>
                </FadeSlide>

                {/* Alert */}
                {(error || success) && (
                  <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium mb-5 ${
                    success
                      ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                  }`}>
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      {success
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      }
                    </svg>
                    {error || success}
                  </div>
                )}

                {/* ── LOGIN FORM ──────────────────────────────────────────────────── */}
                {isLogin && (
                  <FadeSlide id="login">
                    <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Email Address</label>
                        <input type="email" required autoComplete="email" value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com" className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Password</label>
                        <div className="relative">
                          <input type={showPass ? "text" : "password"} required
                            autoComplete="current-password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password" className={`${inputCls} pr-12`} />
                          <button type="button" onClick={() => setShowPass(!showPass)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                            {showPass ? (
                              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <button type="submit" disabled={isLoading}
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-1">
                        {isLoading ? (
                          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                        )}
                        Sign in to Dashboard
                      </button>
                    </form>

                    {/* Divider + Google */}
                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                      <span className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-widest">or</span>
                      <div className="flex-1 h-px bg-gray-100 dark:bg-slate-800" />
                    </div>
                    <button type="button" onClick={() => (window.location.href = `${API_BASE}/auth/google/login`)}
                      className="w-full h-12 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-2xl text-sm font-semibold text-gray-700 dark:text-slate-200 transition-all">
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </button>
                  </FadeSlide>
                )}

                {/* ── SIGNUP FORM (Step 1) ────────────────────────────────────────── */}
                {!isLogin && (
                  <FadeSlide id="signup">
                    <form onSubmit={handleDetailsNext} className="space-y-4">

                      {/* Full Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Full Name</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </span>
                          <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                            placeholder="John Smith" className={`${inputCls} pl-10`} />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Email Address</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com" className={`${inputCls} pl-10`} />
                        </div>
                      </div>

                      {/* Password */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Password</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </span>
                          <input type={showPass ? "text" : "password"} required autoComplete="new-password"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 6 characters" className={`${inputCls} pl-10 pr-12`} />
                          <button type="button" onClick={() => setShowPass(!showPass)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
                            {showPass ? (
                              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            ) : (
                              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
                          Phone Number
                          {(() => {
                            const meta = COUNTRY_CODES.find(c => c.code === countryCode);
                            return meta ? (
                              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-500">
                                {meta.digits} digits for {meta.name}
                              </span>
                            ) : null;
                          })()}
                        </label>
                        <div className="flex gap-2">
                          <FlagSelect value={countryCode} onChange={v => { setCountryCode(v); setPhone(""); }} />
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            value={phone}
                            onChange={e => {
                              const digits = e.target.value.replace(/\D/g, "");
                              const max = COUNTRY_CODES.find(c => c.code === countryCode)?.digits ?? 15;
                              setPhone(digits.slice(0, max));
                            }}
                            placeholder={`${"0".repeat(COUNTRY_CODES.find(c => c.code === countryCode)?.digits ?? 10)}`}
                            className={`${inputCls} flex-1 tracking-widest`}
                          />
                        </div>
                      </div>

                      {/* Company Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Company Name</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </span>
                          <input type="text" required value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Acme Pvt Ltd" className={`${inputCls} pl-10`} />
                        </div>
                      </div>

                      {/* Company Type */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Company Type</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                          <select required value={companyType} onChange={(e) => setCompanyType(e.target.value)}
                            className={`${inputCls} pl-10 appearance-none pr-10 ${!companyType ? "text-gray-400 dark:text-slate-500" : ""}`}>
                            <option value="" disabled>Select Company Type</option>
                            {COMPANY_TYPES.map(t => (
                              <option key={t} value={t} className="text-gray-900 dark:text-slate-100">{t}</option>
                            ))}
                          </select>
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {/* Next button */}
                      <button type="submit"
                        className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2.5 mt-2">
                        Next — Choose your plan
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </form>
                  </FadeSlide>
                )}

                {/* Switch mode */}
                <p className="text-center text-sm text-gray-400 dark:text-slate-500 mt-6">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button type="button" onClick={() => switchMode(!isLogin)}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    {isLogin ? "Sign up free" : "Sign in"}
                  </button>
                </p>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
