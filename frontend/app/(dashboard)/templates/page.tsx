"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { Template } from "@/lib/types";

const INPUT = "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all";
const BTN_P = "flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/25";
const BTN_G = "flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all";
const VARS = ["{{name}}", "{{phone}}", "{{email}}", "{{tags}}"];

const prev = (b: string) => b.replace(/{{name}}/g, "Ramesh Kumar").replace(/{{phone}}/g, "+919876543210").replace(/{{email}}/g, "ramesh@example.com").replace(/{{tags}}/g, "VIP");

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", body: "" });

  const load = async () => { setLoading(true); try { setTemplates(await apiGet<Template[]>("/templates/")); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ name: "", body: "" }); setOpen(true); };
  const openEdit = (t: Template) => { setEditing(t); setForm({ name: t.name, body: t.body }); setOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { editing ? await apiPut(`/templates/${editing.id}`, form) : await apiPost("/templates/", form); setOpen(false); load(); }
    catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this template?")) return;
    try { await apiDelete(`/templates/${id}`); load(); } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Templates</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Reusable WhatsApp message templates with dynamic variables</p>
        </div>
        <button onClick={openNew} className={BTN_P}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Template
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <EmptyState title="No templates yet" description="Create templates with dynamic variables like {{name}} and {{phone}} for personalized messaging."
            action={<button onClick={openNew} className={BTN_P}>Create Template</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {templates.map(t => (
            <div key={t.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-4 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-gray-950/60 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 grad-3">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{t.name}</h3>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => openEdit(t)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all">Edit</button>
                  <button onClick={() => handleDelete(t.id)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all">Delete</button>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap line-clamp-4 leading-relaxed">{t.body}</p>
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 mb-1.5">Preview</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap line-clamp-3 leading-relaxed bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5">{prev(t.body)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Template" : "New Template"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div><label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">Template Name *</label>
            <input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Diwali Greeting" className={INPUT} /></div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Message Body *</label>
              <div className="flex gap-1 flex-wrap justify-end">
                {VARS.map(v => <button key={v} type="button" onClick={() => setForm(f => ({...f,body:f.body+v}))}
                  className="text-xs px-1.5 py-0.5 rounded font-mono bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all">{v}</button>)}
              </div>
            </div>
            <textarea required value={form.body} onChange={e => setForm({...form,body:e.target.value})} rows={6}
              placeholder={"Hi {{name}},\n\nWe have a special offer for you!"} className={`${INPUT} resize-none font-mono text-xs`} />
          </div>
          {form.body && (
            <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">Live Preview</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{prev(form.body)}</p>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setOpen(false)} className={`${BTN_G} flex-1`}>Cancel</button>
            <button type="submit" disabled={saving} className={`${BTN_P} flex-1`}>{saving && <Spinner className="text-white" />}{editing ? "Save Changes" : "Create"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
