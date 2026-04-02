"use client";

import { useEffect, useState, useRef } from "react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { Lead, LeadGroup } from "@/lib/types";

const INPUT =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all";
const BTN_P =
  "flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/25";
const BTN_G =
  "flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all";
const LABEL = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5";

const EMPTY_FORM = {
  name: "",
  phone_no: "",
  email: "",
  company_name: "",
  address_line1: "",
  address_line2: "",
  address_line3: "",
  pincode: "",
  city: "",
  state: "",
  country: "",
  tags: "",
  status: "prospect",
};

const PRESET_STATUSES = ["prospect", "customer", "hot lead", "cold lead", "negotiation", "closed"];

function parseCsv(text: string) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    return Object.fromEntries(
      headers.map((h, i) => [h, (vals[i] || "").trim()]),
    );
  });
}

async function syncGroups(
  leadId: number,
  newGroupIds: number[],
  oldGroupIds: number[],
  apiBase: string,
  token: string | null,
) {
  const toAdd = newGroupIds.filter((id) => !oldGroupIds.includes(id));
  const toRemove = oldGroupIds.filter((id) => !newGroupIds.includes(id));
  for (const groupId of toAdd) {
    await apiPost(`/leads/groups/${groupId}/members`, { lead_ids: [leadId] });
  }
  for (const groupId of toRemove) {
    await fetch(`${apiBase}/leads/groups/${groupId}/members`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ lead_ids: [leadId] }),
    });
  }
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [groups, setGroups] = useState<LeadGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);

  // Add lead
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addGroupIds, setAddGroupIds] = useState<number[]>([]);

  // Edit lead
  const [editOpen, setEditOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editGroupIds, setEditGroupIds] = useState<number[]>([]);
  const originalEditGroupIds = useRef<number[]>([]);

  // Delete lead confirmation modal
  const [deleteLeadId, setDeleteLeadId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // New group
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: "", description: "" });

  // Edit group
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<LeadGroup | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({ name: "", description: "" });

  // Delete group confirmation modal
  const [deleteGroupId, setDeleteGroupId] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const load = async (q = search, s = filter) => {
    setLoading(true);
    try {
      const path = `/leads/?limit=200${q ? `&search=${encodeURIComponent(q)}` : ""}${s ? `&status=${s}` : ""}`;
      const [l, g] = await Promise.all([
        apiGet<Lead[]>(path),
        apiGet<LeadGroup[]>("/leads/groups/all"),
      ]);
      setLeads(l);
      setGroups(g);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Add Lead ──
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newLead = await apiPost<Lead>("/leads/", form);
      if (addGroupIds.length > 0) {
        await syncGroups(newLead.id, addGroupIds, [], apiBase, getToken());
      }
      setAddOpen(false);
      setForm(EMPTY_FORM);
      setAddGroupIds([]);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit Lead ──
  const openEdit = async (lead: Lead) => {
    setEditLead(lead);
    setEditForm({
      name: lead.name,
      phone_no: lead.phone_no,
      email: lead.email || "",
      company_name: lead.company_name || "",
      address_line1: lead.address_line1 || "",
      address_line2: lead.address_line2 || "",
      address_line3: lead.address_line3 || "",
      pincode: lead.pincode || "",
      city: lead.city || "",
      state: lead.state || "",
      country: lead.country || "",
      tags: lead.tags || "",
      status: lead.status,
    });
    try {
      const data = await apiGet<{ group_ids: number[] }>(`/leads/${lead.id}/groups`);
      originalEditGroupIds.current = data.group_ids;
      setEditGroupIds([...data.group_ids]);
    } catch {
      originalEditGroupIds.current = [];
      setEditGroupIds([]);
    }
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLead) return;
    setSaving(true);
    try {
      await apiPut(`/leads/${editLead.id}`, editForm);
      await syncGroups(editLead.id, editGroupIds, originalEditGroupIds.current, apiBase, getToken());
      setEditOpen(false);
      setEditLead(null);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Lead ──
  const handleDeleteLead = async () => {
    if (!deleteLeadId) return;
    setDeleteError("");
    try {
      await apiDelete(`/leads/${deleteLeadId}`);
      setDeleteLeadId(null);
      load();
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  // ── CSV Import ──
  const handleCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    const mapped = rows
      .map((r) => ({
        name: r.name || r.full_name || "Unknown",
        phone_no: r.phone || r.phone_no || r.mobile || "",
        email: r.email,
        tags: r.tags,
        status: r.status || "prospect",
      }))
      .filter((r) => r.phone_no);
    if (!mapped.length)
      return alert("No valid rows — check CSV has a 'phone' column");
    setSaving(true);
    try {
      await apiPost("/leads/import", mapped);
      load();
      alert(`${mapped.length} leads imported!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Create Group ──
  const handleGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/leads/groups", groupForm);
      setGroupOpen(false);
      setGroupForm({ name: "", description: "" });
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit Group ──
  const openEditGroup = (g: LeadGroup) => {
    setEditGroup(g);
    setEditGroupForm({ name: g.name, description: g.description || "" });
    setEditGroupOpen(true);
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroup) return;
    setSaving(true);
    try {
      await apiPut(`/leads/groups/${editGroup.id}`, editGroupForm);
      setEditGroupOpen(false);
      setEditGroup(null);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete Group ──
  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    try {
      await apiDelete(`/leads/groups/${deleteGroupId}`);
      setDeleteGroupId(null);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ── Shared: Lead Form Fields ──
  function LeadFormFields({
    f,
    setF,
    groupIds,
    setGroupIds,
    idPrefix,
  }: {
    f: typeof EMPTY_FORM;
    setF: (v: typeof EMPTY_FORM) => void;
    groupIds: number[];
    setGroupIds: (v: number[]) => void;
    idPrefix: string;
  }) {
    const toggleGroup = (gid: number) => {
      setGroupIds(
        groupIds.includes(gid)
          ? groupIds.filter((id) => id !== gid)
          : [...groupIds, gid],
      );
    };
    return (
      <div className="overflow-y-auto max-h-[60vh] pr-1 space-y-4">
        {/* Row: Name + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Name *</label>
            <input
              required
              type="text"
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
              placeholder="Full name"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Phone *</label>
            <input
              required
              type="text"
              value={f.phone_no}
              onChange={(e) => setF({ ...f, phone_no: e.target.value })}
              placeholder="+919876543210"
              className={INPUT}
            />
          </div>
        </div>

        {/* Row: Email + Company */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Email</label>
            <input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              placeholder="email@example.com"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Company Name</label>
            <input
              type="text"
              value={f.company_name}
              onChange={(e) => setF({ ...f, company_name: e.target.value })}
              placeholder="Acme Corp"
              className={INPUT}
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className={LABEL}>Address Line 1</label>
          <input
            type="text"
            value={f.address_line1}
            onChange={(e) => setF({ ...f, address_line1: e.target.value })}
            placeholder="Street / Building"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Address Line 2</label>
          <input
            type="text"
            value={f.address_line2}
            onChange={(e) => setF({ ...f, address_line2: e.target.value })}
            placeholder="Area / Landmark"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL}>Address Line 3</label>
          <input
            type="text"
            value={f.address_line3}
            onChange={(e) => setF({ ...f, address_line3: e.target.value })}
            placeholder="Locality (optional)"
            className={INPUT}
          />
        </div>

        {/* Row: Pincode + City */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Pincode</label>
            <input
              type="text"
              value={f.pincode}
              onChange={(e) => setF({ ...f, pincode: e.target.value })}
              placeholder="400001"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>City</label>
            <input
              type="text"
              value={f.city}
              onChange={(e) => setF({ ...f, city: e.target.value })}
              placeholder="Mumbai"
              className={INPUT}
            />
          </div>
        </div>

        {/* Row: State + Country */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>State</label>
            <input
              type="text"
              value={f.state}
              onChange={(e) => setF({ ...f, state: e.target.value })}
              placeholder="Maharashtra"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Country</label>
            <input
              type="text"
              value={f.country}
              onChange={(e) => setF({ ...f, country: e.target.value })}
              placeholder="India"
              className={INPUT}
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className={LABEL}>Tags</label>
          <input
            type="text"
            value={f.tags}
            onChange={(e) => setF({ ...f, tags: e.target.value })}
            placeholder="VIP, Referral (comma-separated)"
            className={INPUT}
          />
        </div>

        {/* Status combobox */}
        <div>
          <label className={LABEL}>Status</label>
          <input
            list={`${idPrefix}-status-list`}
            value={f.status}
            onChange={(e) => setF({ ...f, status: e.target.value })}
            placeholder="Select or type a status"
            className={INPUT}
          />
          <datalist id={`${idPrefix}-status-list`}>
            {PRESET_STATUSES.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        {/* Groups */}
        {groups.length > 0 && (
          <div>
            <label className={LABEL}>Add to Groups</label>
            <div className="space-y-2">
              {groups.map((g) => (
                <label
                  key={g.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={groupIds.includes(g.id)}
                    onChange={() => toggleGroup(g.id)}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {g.name}
                    </p>
                    {g.description && (
                      <p className="text-xs text-gray-400 truncate">{g.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{g.member_count}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Leads
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {leads.length} contacts
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className={`${BTN_G} cursor-pointer`}>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import CSV
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsv}
            />
          </label>
          <button onClick={() => setGroupOpen(true)} className={BTN_G}>
            New Group
          </button>
          <button onClick={() => setAddOpen(true)} className={BTN_P}>
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Lead
          </button>
        </div>
      </div>

      {/* Groups */}
      {groups.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span>{g.name}</span>
              <span className="text-gray-400 dark:text-gray-600">
                · {g.member_count}
              </span>
              <div className="flex items-center gap-0.5 ml-1">
                <button
                  onClick={() => openEditGroup(g)}
                  className="p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-400 hover:text-indigo-500 transition-all"
                  title="Edit group"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.232 5.232l3.536 3.536M9 13l6.5-6.5a2 2 0 012.828 2.828L11.828 15.828a4 4 0 01-2.828 1.172H7v-2a4 4 0 011.172-2.828z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setDeleteGroupId(g.id)}
                  className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all"
                  title="Delete group"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-56">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              load(e.target.value, filter);
            }}
            placeholder="Search by name, phone, email..."
            className={`${INPUT} pl-10`}
          />
        </div>
        <input
          list="filter-status-list"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            load(search, e.target.value);
          }}
          placeholder="Filter by status"
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all min-w-40"
        />
        <datalist id="filter-status-list">
          <option value="" />
          {PRESET_STATUSES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <EmptyState
            title="No leads found"
            description="Add leads manually or import a CSV file."
            action={
              <button onClick={() => setAddOpen(true)} className={BTN_P}>
                Add First Lead
              </button>
            }
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {["Name", "Phone", "Email", "Tags", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                    <div>{lead.name}</div>
                    {lead.company_name && (
                      <div className="text-xs text-gray-400 font-normal">
                        {lead.company_name}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                    {lead.phone_no}
                  </td>
                  <td className="px-5 py-4 text-gray-400 dark:text-gray-500 hidden md:table-cell">
                    {lead.email || "—"}
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    {lead.tags ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.split(",").map((t) => (
                          <span
                            key={t}
                            className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                          >
                            {t.trim()}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <Badge label={lead.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(lead)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setDeleteError("");
                          setDeleteLeadId(lead.id);
                        }}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add Lead Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setForm(EMPTY_FORM);
          setAddGroupIds([]);
        }}
        title="Add New Lead"
        wide
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <LeadFormFields
            f={form}
            setF={setForm}
            groupIds={addGroupIds}
            setGroupIds={setAddGroupIds}
            idPrefix="add"
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setAddOpen(false);
                setForm(EMPTY_FORM);
                setAddGroupIds([]);
              }}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`${BTN_P} flex-1`}>
              {saving && <Spinner className="text-white" />}Add Lead
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Lead Modal ── */}
      <Modal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditLead(null);
        }}
        title="Edit Lead"
        wide
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <LeadFormFields
            f={editForm}
            setF={setEditForm}
            groupIds={editGroupIds}
            setGroupIds={setEditGroupIds}
            idPrefix="edit"
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditLead(null);
              }}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className={`${BTN_P} flex-1`}>
              {saving && <Spinner className="text-white" />}Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Lead Confirm Modal ── */}
      <Modal
        open={deleteLeadId !== null}
        onClose={() => setDeleteLeadId(null)}
        title="Delete Lead"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this lead? This action cannot be
            undone.
          </p>
          {deleteError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {deleteError}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setDeleteLeadId(null)}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteLead}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* ── New Group Modal ── */}
      <Modal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        title="New Lead Group"
      >
        <form onSubmit={handleGroup} className="space-y-4">
          <div>
            <label className={LABEL}>Group Name *</label>
            <input
              required
              value={groupForm.name}
              onChange={(e) =>
                setGroupForm({ ...groupForm, name: e.target.value })
              }
              placeholder="e.g. Mumbai Clients"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <textarea
              value={groupForm.description}
              onChange={(e) =>
                setGroupForm({ ...groupForm, description: e.target.value })
              }
              placeholder="Optional description"
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setGroupOpen(false)}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${BTN_P} flex-1`}
            >
              {saving && <Spinner className="text-white" />}Create
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Group Modal ── */}
      <Modal
        open={editGroupOpen}
        onClose={() => setEditGroupOpen(false)}
        title="Edit Group"
      >
        <form onSubmit={handleEditGroup} className="space-y-4">
          <div>
            <label className={LABEL}>Group Name *</label>
            <input
              required
              value={editGroupForm.name}
              onChange={(e) =>
                setEditGroupForm({ ...editGroupForm, name: e.target.value })
              }
              placeholder="Group name"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <textarea
              value={editGroupForm.description}
              onChange={(e) =>
                setEditGroupForm({
                  ...editGroupForm,
                  description: e.target.value,
                })
              }
              placeholder="Optional description"
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setEditGroupOpen(false)}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${BTN_P} flex-1`}
            >
              {saving && <Spinner className="text-white" />}Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Group Confirm Modal ── */}
      <Modal
        open={deleteGroupId !== null}
        onClose={() => setDeleteGroupId(null)}
        title="Delete Group"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Delete this group? Leads inside will not be deleted, only the group
            itself.
          </p>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setDeleteGroupId(null)}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteGroup}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
