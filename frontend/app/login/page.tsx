"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳", label: "+91" },
  { code: "+1",  flag: "🇺🇸", label: "+1"  },
  { code: "+44", flag: "🇬🇧", label: "+44" },
  { code: "+61", flag: "🇦🇺", label: "+61" },
  { code: "+971",flag: "🇦🇪", label: "+971"},
  { code: "+65", flag: "🇸🇬", label: "+65" },
  { code: "+81", flag: "🇯🇵", label: "+81" },
  { code: "+49", flag: "🇩🇪", label: "+49" },
  { code: "+33", flag: "🇫🇷", label: "+33" },
  { code: "+55", flag: "🇧🇷", label: "+55" },
];

const DIGIT_REQ: Record<string, number | number[]> = {
  "+91": 10, "+1": 10, "+44": 10, "+61": 9, "+81": [10, 11],
  "+49": [10, 11], "+33": 9, "+39": [9, 10], "+34": 9, "+65": 8,
  "+971": 9, "+966": 9, "+55": [10, 11], "+27": 9, "+7": 10,
};

const STRENGTH_LABEL = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["bg-gray-300", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"];

export default function LoginPage() {
  const [isLogin, setIsLogin]         = useState(true);
  const [loginType, setLoginType]     = useState<"email" | "phone">("email");
  const [countryCode, setCountryCode] = useState("+91");
  const [identifier, setIdentifier]   = useState("");
  const [password, setPassword]       = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [strength, setStrength]       = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (isLogin) return;
    let s = 0;
    if (password.length > 8)           s++;
    if (/[A-Z]/.test(password))        s++;
    if (/[0-9]/.test(password))        s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    setStrength(s);
  }, [password, isLogin]);

  const reset = () => { setIdentifier(""); setPassword(""); setError(""); setSuccess(""); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (loginType === "phone") {
      if (!/^\d+$/.test(identifier)) { setError("Phone number must contain only digits."); return; }
      const req = DIGIT_REQ[countryCode];
      const ok  = Array.isArray(req) ? req.includes(identifier.length) : identifier.length === req;
      if (!ok) { setError(`Phone number length is invalid for ${countryCode}`); return; }
    } else {
      if (!identifier.includes("@")) { setError("Enter a valid email address."); return; }
    }
    if (!isLogin && strength < 4) { setError("Please choose a stronger password."); return; }

    setIsLoading(true);
    const username = loginType === "phone" ? `${countryCode}${identifier}` : identifier;

    try {
      if (isLogin) {
        const body = new URLSearchParams({ username, password });
        const res  = await fetch("http://localhost:8000/login", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Login failed"); }
        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        document.cookie = `access_token=${data.access_token}; path=/; max-age=1800; SameSite=Lax`;
        router.push("/dashboard");
      } else {
        const payload = loginType === "phone" ? { phone_no: username, password } : { email: username, password };
        const res = await fetch("http://localhost:8000/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Registration failed"); }
        setIsLogin(true); reset();
        setSuccess("Account created! You can now sign in.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const maxLen = (() => {
    const r = DIGIT_REQ[countryCode];
    return Array.isArray(r) ? Math.max(...r) : r as number;
  })();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-4 py-12 relative overflow-hidden">

      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card */}
      <div className="relative w-full max-w-[460px] bg-white rounded-3xl shadow-2xl shadow-black/40 overflow-hidden">

        {/* Card top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />

        <div className="px-10 py-10">

          {/* Brand */}
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl overflow-hidden relative shadow-lg shadow-indigo-200 mb-4">
              <Image src="/logo.png" alt="OneToMany" fill className="object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 text-center">
              {isLogin ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-sm text-gray-400 mt-1 text-center">
              {isLogin ? "Sign in to your OneToMany dashboard" : "Start your WhatsApp automation journey"}
            </p>
          </div>

          {/* Alerts */}
          {(error || success) && (
            <div className={`flex items-start gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium mb-6 ${
              success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
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

          {/* Login type tabs */}
          <div className="flex bg-gray-100 p-1 rounded-2xl mb-7">
            {(["email", "phone"] as const).map((t) => (
              <button key={t} type="button"
                onClick={() => { setLoginType(t); setIdentifier(""); setError(""); setSuccess(""); }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  loginType === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}>
                {t === "email" ? "Email" : "Mobile Number"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Identifier field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                {loginType === "email" ? "Email Address" : "Phone Number"}
              </label>
              {loginType === "email" ? (
                <input
                  type="email" required autoComplete="email"
                  value={identifier} onChange={e => setIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              ) : (
                <div className="flex gap-2">
                  <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
                    className="h-12 bg-gray-50 border border-gray-200 rounded-2xl px-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all w-28 shrink-0">
                    {COUNTRY_CODES.map(c => (
                      <option key={c.code} value={c.code}>{c.label} {c.flag}</option>
                    ))}
                  </select>
                  <input
                    type="tel" required value={identifier} maxLength={maxLen}
                    onChange={e => setIdentifier(e.target.value.replace(/\D/g, ""))}
                    placeholder="Mobile number"
                    className="flex-1 h-12 bg-gray-50 border border-gray-200 rounded-2xl px-4 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} required autoComplete={isLogin ? "current-password" : "new-password"}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-2xl px-4 pr-12 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPass
                    ? <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>

              {/* Strength meter */}
              {!isLogin && password.length > 0 && (
                <div className="pt-1">
                  <div className="flex gap-1.5 mb-2">
                    {[1,2,3,4].map(l => (
                      <div key={l} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${strength >= l ? STRENGTH_COLOR[strength] : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Password strength: <span className="font-semibold text-gray-600">{STRENGTH_LABEL[strength]}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading || (!isLogin && strength < 4)}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 active:scale-[.98] text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mt-2">
              {isLoading
                ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
              }
              {isLogin ? "Sign in to Dashboard" : "Create Account"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-7">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* OAuth */}
          <div className="space-y-3">
            <button onClick={() => window.location.href = "http://localhost:8000/auth/google/login"} type="button"
              className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-2xl text-sm font-semibold text-gray-700 transition-all">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => window.location.href = "http://localhost:8000/auth/apple/login"} type="button"
                className="h-12 flex items-center justify-center gap-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-2xl text-sm font-semibold text-gray-700 transition-all">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 24 184.5 15.6 235.9c-8.1 49.3-5 110.8 17.5 149.2 23.3 39.8 48.9 74.3 84.7 75.6 38.6 1.4 52.8-21.6 96.1-21.6 43.1 0 54.4 21.6 93.8 21.6 36.9 0 59.9-38.3 83.3-76.5 15.7-25.7 22.3-55 22.9-56.7-1.5-1.1-39-16.1-39-58.8zM245.8 89.2c16.3-19.4 30.6-47.5 27.6-76.4-25.7 1.1-55.8 17.5-73.3 38.3-15.3 18.1-31.1 47.2-27.2 74.9 29.2 1.9 56.6-17.5 72.9-36.8z"/>
                </svg>
                Apple
              </button>
              <button onClick={() => window.location.href = "http://localhost:8000/auth/microsoft/login"} type="button"
                className="h-12 flex items-center justify-center gap-2.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-2xl text-sm font-semibold text-gray-700 transition-all">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 21 21">
                  <path fill="#f35325" d="M0 0h10v10H0z"/><path fill="#81bc06" d="M11 0h10v10H11z"/>
                  <path fill="#05a6f0" d="M0 11h10v10H0z"/><path fill="#ffba08" d="M11 11h10v10H11z"/>
                </svg>
                Microsoft
              </button>
            </div>
          </div>

          {/* Toggle sign-in/up */}
          <p className="text-center text-sm text-gray-400 mt-8">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button type="button"
              onClick={() => { setIsLogin(!isLogin); reset(); }}
              className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
