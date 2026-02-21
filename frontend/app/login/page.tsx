"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loginType, setLoginType] = useState<"email" | "phone">("email");
  const [countryCode, setCountryCode] = useState("+91");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [strengthScore, setStrengthScore] = useState(0);

  useEffect(() => {
    if (isLogin) return;
    let score = 0;
    if (password.length > 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    setStrengthScore(score);
  }, [password, isLogin]);

  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["bg-zinc-200", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];

  const countryDigitRequirements: Record<string, number | number[]> = {
    "+91": 10,
    "+1": 10,
    "+44": 10,
    "+61": 9,
    "+81": [10, 11],
    "+49": [10, 11],
    "+33": 9,
    "+39": [9, 10],
    "+34": 9,
    "+65": 8,
    "+971": 9,
    "+966": 9,
    "+55": [10, 11],
    "+27": 9,
    "+7": 10,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (loginType === "phone") {
        if (!/^\d+$/.test(identifier)) {
             setError("Phone number must contain only digits.");
             return;
        }
        const req = countryDigitRequirements[countryCode];
        const isValidLength = Array.isArray(req) ? req.includes(identifier.length) : identifier.length === req;
        
        if (!isValidLength) {
            setError(`Invalid length. Phone numbers for ${countryCode} must be ${Array.isArray(req) ? req.join(' or ') : req} digits.`);
            return;
        }
    } else {
        if (!identifier.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }
    }

    if (!isLogin && strengthScore < 4) {
      setError("Please choose a stronger password before signing up.");
      return;
    }

    setIsLoading(true);
    const finalUsername = loginType === "phone" ? `${countryCode}${identifier}` : identifier;

    try {
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append("username", finalUsername);
        formData.append("password", password);

        const res = await fetch("http://localhost:8000/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || "Login failed");
        }

        const data = await res.json();
        localStorage.setItem("access_token", data.access_token);
        router.push("/");
      } else {
        const payload = loginType === "phone" 
            ? { phone_no: finalUsername, password } 
            : { email: finalUsername, password };

        const res = await fetch("http://localhost:8000/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || "Registration failed");
        }

        setIsLogin(true);
        setIdentifier("");
        setPassword("");
        setError("Account created perfectly! Please sign in with your new credentials.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    window.location.href = `http://localhost:8000/auth/${provider}/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans p-4 dark:bg-zinc-950">
      <div className="w-full max-w-[420px] md:max-w-[840px] bg-white dark:bg-zinc-900 rounded-[24px] shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 border border-zinc-100 dark:border-zinc-800 transition-all flex flex-col md:flex-row overflow-hidden">
        
        <div className="hidden md:flex md:w-1/2 bg-zinc-100 dark:bg-zinc-950/50 p-12 flex-col items-center justify-center border-r border-zinc-100 dark:border-zinc-800 text-center">
            <div className="h-24 w-24 bg-white dark:bg-zinc-900 rounded-3xl flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm relative mb-8">
                <Image src="/logo.png" alt="Nano Banana Automation Logo" fill className="object-cover" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
                Scale your outreach.
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium max-w-[260px] leading-relaxed">
                Connect with thousands of customers seamlessly using our intelligent WhatsApp automation engine.
            </p>
        </div>

        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
            <div className="flex justify-center mb-6 md:hidden">
            <div className="h-16 w-16 bg-zinc-100 rounded-2xl flex items-center justify-center overflow-hidden border border-zinc-200 shadow-sm relative">
                <Image src="/logo.png" alt="Nano Banana Automation Logo" fill className="object-cover" />
            </div>
            </div>

            <div className="text-center mb-8 md:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {isLogin ? "Welcome back" : "Start Automating"}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm font-medium">
                One to Many WhatsApp Automation
            </p>
            </div>

            {error && (
            <div className={`p-3.5 mb-6 rounded-xl text-sm font-semibold text-center ${error.includes('perfectly') ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/50' : 'bg-red-50 text-red-600 border border-red-200/50'}`}>
                {error}
            </div>
            )}

            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl mb-6">
            <button 
                onClick={() => { setLoginType("email"); setIdentifier(""); setError(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${loginType === "email" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
            >
                Email
            </button>
            <button 
                onClick={() => { setLoginType("phone"); setIdentifier(""); setError(""); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${loginType === "phone" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
            >
                Mobile Number
            </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              {loginType === "email" ? "Email Address" : "Phone Number"}
            </label>
            
            {loginType === "email" ? (
                <input
                    type="email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all font-medium"
                    placeholder="john.doe@example.com"
                    required
                />
            ) : (
                <div className="flex gap-2">
                    <select 
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-2 py-3 text-zinc-900 dark:text-zinc-100 outline-none font-medium w-28 text-center cursor-pointer appearance-none"
                    >
                        <option value="+91">+91 🇮🇳</option>
                        <option value="+1">+1 🇺🇸</option>
                        <option value="+44">+44 🇬🇧</option>
                        <option value="+61">+61 🇦🇺</option>
                        <option value="+81">+81 🇯🇵</option>
                        <option value="+49">+49 🇩🇪</option>
                        <option value="+33">+33 🇫🇷</option>
                        <option value="+39">+39 🇮🇹</option>
                        <option value="+34">+34 🇪🇸</option>
                        <option value="+65">+65 🇸🇬</option>
                        <option value="+971">+971 🇦🇪</option>
                        <option value="+966">+966 🇸🇦</option>
                        <option value="+55">+55 🇧🇷</option>
                        <option value="+27">+27 🇿🇦</option>
                        <option value="+7">+7 🇷🇺</option>
                    </select>
                    <input
                        type="tel"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all font-medium"
                        placeholder="Enter mobile number"
                        maxLength={Array.isArray(countryDigitRequirements[countryCode]) ? Math.max(...(countryDigitRequirements[countryCode] as number[])) : countryDigitRequirements[countryCode] as number}
                        required
                    />
                </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none transition-all font-medium"
              placeholder="Enter a secure password..."
              required
            />
            
            {!isLogin && password.length > 0 && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex gap-1 mb-1.5">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                        strengthScore >= level ? strengthColors[strengthScore] : "bg-zinc-200 dark:bg-zinc-800"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex justify-between">
                  <span>Password strength: <span className="text-zinc-700 dark:text-zinc-300">{strengthLabels[strengthScore]}</span></span>
                  {strengthScore < 4 && <span className="text-red-500">Needs more variation</span>}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || (!isLogin && strengthScore < 4)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            {isLogin ? "Sign in to Dashboard" : "Create Account"}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Or continue with</span>
          <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1"></div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button onClick={() => handleOAuthLogin('google')} type="button" className="flex items-center justify-center gap-3 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl px-4 py-2.5 font-semibold text-sm text-zinc-700 dark:text-zinc-300 transition-all">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>
          <div className="flex gap-3">
            <button onClick={() => handleOAuthLogin('apple')} type="button" className="flex items-center justify-center gap-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl px-4 py-2.5 font-semibold text-sm text-zinc-700 dark:text-zinc-300 transition-all">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512">
                 <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 24 184.5 15.6 235.9c-8.1 49.3-5 110.8 17.5 149.2 23.3 39.8 48.9 74.3 84.7 75.6 38.6 1.4 52.8-21.6 96.1-21.6 43.1 0 54.4 21.6 93.8 21.6 36.9 0 59.9-38.3 83.3-76.5 15.7-25.7 22.3-55 22.9-56.7-1.5-1.1-39-16.1-39-58.8zM245.8 89.2c16.3-19.4 30.6-47.5 27.6-76.4-25.7 1.1-55.8 17.5-73.3 38.3-15.3 18.1-31.1 47.2-27.2 74.9 29.2 1.9 56.6-17.5 72.9-36.8z" />
              </svg>
              Apple
            </button>
            <button onClick={() => handleOAuthLogin('microsoft')} type="button" className="flex items-center justify-center gap-2 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl px-4 py-2.5 font-semibold text-sm text-zinc-700 dark:text-zinc-300 transition-all">
              <svg className="w-4 h-4" viewBox="0 0 21 21">
                <path fill="#f35325" d="M0 0h10v10H0z"/><path fill="#81bc06" d="M11 0h10v10H11z"/><path fill="#05a6f0" d="M0 11h10v10H0z"/><path fill="#ffba08" d="M11 11h10v10H11z"/>
              </svg>
              Microsoft
            </button>
          </div>
        </div>

        <div className="mt-8 text-center bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 -mx-8 -mb-8 p-6 md:rounded-br-[24px]">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
              setPassword("");
              setIdentifier("");
            }}
            className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-500 transition-colors"
          >
            {isLogin ? "New to the platform? " : "Already have an account? "}
            <span className="text-zinc-900 dark:text-zinc-100 underline decoration-2 underline-offset-4 decoration-emerald-500/30 hover:decoration-emerald-500 transition-all">
              {isLogin ? "Sign up" : "Sign in"}
            </span>
          </button>
        </div>
      </div>
     </div>
    </div>
  );
}
