"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { apiGet, apiPatch } from "@/lib/api";

interface Profile {
  id: number;
  email: string | null;
  phone_no: string | null;
  full_name: string | null;
  company_name: string | null;
  company_type: string | null;
  plan: string;
  created_at: string;
}

const COMPANY_TYPES = [
  "Retail / E-commerce",
  "Healthcare",
  "Education / EdTech",
  "Real Estate",
  "Finance / Banking",
  "Hospitality / Travel",
  "Technology / SaaS",
  "Manufacturing",
  "Non-Profit / NGO",
  "Agency / Marketing",
  "Other",
];

const PLAN_BADGE: Record<string, string> = {
  free:     "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400",
  pro:      "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300",
  business: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300",
};

const inputCls = "w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const labelCls = "block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5";

export default function AccountModal({
  open,
  onClose,
  onProfileUpdate,
}: {
  open: boolean;
  onClose: () => void;
  onProfileUpdate?: (profile: Profile) => void;
}) {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved]       = useState(false);

  // Editable field values (only used when the corresponding profile field is null)
  const [fullName, setFullName]       = useState("");
  const [phoneNo, setPhoneNo]         = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const p = await apiGet<Profile>("/profile");
      setProfile(p);
      // Pre-fill form inputs only for empty fields
      if (!p.full_name)    setFullName("");
      if (!p.phone_no)     setPhoneNo("");
      if (!p.company_name) setCompanyName("");
      if (!p.company_type) setCompanyType("");
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (open) { fetchProfile(); setSaveError(""); setSaved(false); }
  }, [open, fetchProfile]);

  const hasEmpty = profile && (
    !profile.full_name || !profile.phone_no || !profile.company_name || !profile.company_type
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaveError("");
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (!profile.full_name    && fullName.trim())    body.full_name    = fullName.trim();
      if (!profile.phone_no     && phoneNo.trim())     body.phone_no     = phoneNo.trim();
      if (!profile.company_name && companyName.trim()) body.company_name = companyName.trim();
      if (!profile.company_type && companyType)        body.company_type = companyType;

      if (Object.keys(body).length === 0) {
        setSaveError("Nothing to save.");
        return;
      }

      const updated = await apiPatch<Profile>("/profile", body);
      setProfile(updated);
      onProfileUpdate?.(updated);
      setSaved(true);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const initial = profile
    ? (profile.full_name?.[0] || profile.email?.[0] || "U").toUpperCase()
    : "U";

  const displayName = profile?.full_name || profile?.email || "User";

  return (
    <Modal open={open} onClose={onClose} title="Account Settings">
      {loading || !profile ? (
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-5 py-1">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
              <span className="text-xl font-bold text-white">{initial}</span>
            </div>
            <div>
              <p className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                {displayName}
              </p>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize ${PLAN_BADGE[profile.plan] || PLAN_BADGE.free}`}>
                {profile.plan} plan
              </span>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className={labelCls}>
                Full Name
                {profile.full_name && <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(locked)</span>}
              </label>
              <input
                type="text"
                value={profile.full_name ?? fullName}
                onChange={e => setFullName(e.target.value)}
                disabled={!!profile.full_name}
                placeholder="Your full name"
                className={inputCls}
              />
            </div>

            {/* Email — always locked */}
            <div>
              <label className={labelCls}>
                Email <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(locked)</span>
              </label>
              <input
                type="email"
                value={profile.email ?? "—"}
                disabled
                className={inputCls}
              />
            </div>

            {/* Phone */}
            <div>
              <label className={labelCls}>
                Phone Number
                {profile.phone_no && <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(locked)</span>}
              </label>
              <input
                type="text"
                value={profile.phone_no ?? phoneNo}
                onChange={e => setPhoneNo(e.target.value.replace(/\D/g, ""))}
                disabled={!!profile.phone_no}
                placeholder="+91XXXXXXXXXX"
                className={inputCls}
              />
            </div>

            {/* Company Name */}
            <div>
              <label className={labelCls}>
                Company Name
                {profile.company_name && <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(locked)</span>}
              </label>
              <input
                type="text"
                value={profile.company_name ?? companyName}
                onChange={e => setCompanyName(e.target.value)}
                disabled={!!profile.company_name}
                placeholder="Your company"
                className={inputCls}
              />
            </div>

            {/* Company Type */}
            <div>
              <label className={labelCls}>
                Company Type
                {profile.company_type && <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(locked)</span>}
              </label>
              {profile.company_type ? (
                <input
                  type="text"
                  value={profile.company_type}
                  disabled
                  className={inputCls}
                />
              ) : (
                <select
                  value={companyType}
                  onChange={e => setCompanyType(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select company type…</option>
                  {COMPANY_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Plan — always read-only */}
            <div>
              <label className={labelCls}>
                Plan <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(locked)</span>
              </label>
              <input
                type="text"
                value={profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
                disabled
                className={inputCls}
              />
            </div>
          </div>

          {/* Save / feedback */}
          {hasEmpty && !saved && (
            <>
              {saveError && (
                <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-2.5">
                  {saveError}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
              >
                {saving ? <><Spinner className="text-white" /> Saving…</> : "Save Changes →"}
              </button>
            </>
          )}

          {saved && (
            <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Profile updated successfully!
            </div>
          )}
        </form>
      )}
    </Modal>
  );
}
