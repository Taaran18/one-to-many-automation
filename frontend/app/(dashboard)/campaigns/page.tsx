"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import type { Campaign, Template, LeadGroup } from "@/lib/types";
import Link from "next/link";

const INPUT = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all";
const BTN_PRIMARY = "flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[.98]";
const BTN_GHOST = "flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all";

function fmt(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [groups, setGroups] = useState<LeadGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", template_id: "", lead_group_id: "", scheduled_at: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [c, t, g] = await Promise.all([apiGet<Campaign[]>("/campaigns/"), apiGet<Template[]>("/templates/"), apiGet<LeadGroup[]>("/leads/groups/all")]);
      setCampaigns(c); setTemplates(t); setGroups(g);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await apiPost("/campaigns/", { name: form.name, template_id: form.template_id ? +form.template_id : null, lead_group_id: form.lead_group_id ? +form.lead_group_id : null, scheduled_at: form.scheduled_at || null });
      setOpen(false); setForm({ name: "", template_id: "", lead_group_id: "", scheduled_at: "" }); load();
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleStart = async (id: number) => {
    if (!confirm("Start this campaign now?")) return;
    try { await apiPost(`/campaigns/${id}/start`); load(); } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this campaign?")) return;
    try { await apiDelete(`/campaigns/${id}`); load(); } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create and manage your WhatsApp campaigns</p>
        </div>
        <button onClick={() => setOpen(true)} className={BTN_PRIMARY}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <EmptyState title="No campaigns yet" description="Create your first campaign to start reaching your leads." action={<button onClick={() => setOpen(true)} className={BTN_PRIMARY}>Create Campaign</button>} />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {["Campaign", "Template", "Group", "Scheduled", "Status", "Sent", ""].map(h => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider first:rounded-tl-2xl last:rounded-tr-2xl">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/campaigns/${c.id}`} className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{c.name}</Link>
                  </td>
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400">{c.template_name || "—"}</td>
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">{c.lead_group_name || "—"}</td>
                  <td className="px-5 py-4 text-gray-400 dark:text-gray-500 text-xs hidden lg:table-cell">{fmt(c.scheduled_at)}</td>
                  <td className="px-5 py-4"><Badge label={c.status} /></td>
                  <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{c.messages_sent ?? 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {(c.status === "draft" || c.status === "scheduled") && (
                        <button onClick={() => handleStart(c.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all">Start</button>
                      )}
                      <Link href={`/campaigns/${c.id}`} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all">View</Link>
                      <button onClick={() => handleDelete(c.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New Campaign">
        <form onSubmit={handleCreate} className="space-y-4">
          <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Campaign Name *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Diwali Offer 2024" className={INPUT} /></div>
          <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Template</label>
            <select value={form.template_id} onChange={e => setForm({...form, template_id: e.target.value})} className={INPUT}>
              <option value="">Select a template</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select></div>
          <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Lead Group</label>
            <select value={form.lead_group_id} onChange={e => setForm({...form, lead_group_id: e.target.value})} className={INPUT}>
              <option value="">Select a group</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.member_count} leads)</option>)}
            </select></div>
          <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Schedule</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} className={INPUT} /></div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className={`${BTN_GHOST} flex-1`}>Cancel</button>
            <button type="submit" disabled={saving} className={`${BTN_PRIMARY} flex-1`}>{saving && <Spinner className="text-white" />}Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
