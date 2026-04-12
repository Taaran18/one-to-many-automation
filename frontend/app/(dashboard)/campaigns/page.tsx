"use client";

import { useEffect, useRef, useState } from "react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import type { Campaign, Template, LeadGroup, WAStatus } from "@/lib/types";
import Link from "next/link";

const INPUT =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all";
const BTN_PRIMARY =
  "flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[.98]";
const BTN_GHOST =
  "flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all";
const LABEL = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function fmt(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtRecurrence(c: Campaign) {
  const r = c.recurrence;
  if (!r || r === "one_time") return "One Time";
  if (r === "daily") return "Daily";
  if (r === "weekly") {
    if (c.recurrence_config) {
      try {
        const cfg = JSON.parse(c.recurrence_config);
        if (cfg.days?.length) {
          return `Weekly · ${(cfg.days as string[]).map((d) => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)).join(", ")}`;
        }
      } catch {}
    }
    return "Weekly";
  }
  if (r === "monthly") {
    if (c.recurrence_config) {
      try {
        const cfg = JSON.parse(c.recurrence_config);
        if (cfg.day) return `Monthly · Day ${cfg.day}`;
      } catch {}
    }
    return "Monthly";
  }
  return r;
}

const isRecurring = (c: Campaign) =>
  c.recurrence && c.recurrence !== "one_time";

function CampaignActions({
  c,
  onStart,
  onStop,
  onEdit,
  onDuplicate,
  onDelete,
  onTags,
}: {
  c: Campaign;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTags: () => void;
}) {
  const recurring = isRecurring(c);
  return (
    <div className="flex items-center gap-1">
      {/* One-time: show Start on draft/scheduled */}
      {!recurring && (c.status === "draft" || c.status === "scheduled") && (
        <button
          onClick={onStart}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
        >
          Start
        </button>
      )}
      {/* Recurring: show Start only on draft (not scheduled, scheduler handles it) */}
      {recurring && c.status === "draft" && (
        <button
          onClick={onStart}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all"
        >
          Start
        </button>
      )}
      {/* Stop: when running, or recurring & scheduled (cancel upcoming run) */}
      {(c.status === "running" || (recurring && c.status === "scheduled")) && (
        <button
          onClick={onStop}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all"
        >
          Stop
        </button>
      )}
      <button
        onClick={onEdit}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
      >
        Edit
      </button>
      <button
        onClick={onTags}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-all"
      >
        Tags
      </button>
      <button
        onClick={onDuplicate}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
      >
        Copy
      </button>
      <button
        onClick={onDelete}
        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
      >
        Delete
      </button>
    </div>
  );
}

// Shared campaign form body used in both Create and Edit modals
function CampaignFormBody({
  form,
  setForm,
  selectedGroupIds,
  setSelectedGroupIds,
  selectedDays,
  setSelectedDays,
  monthDay,
  setMonthDay,
  groupDropdownOpen,
  setGroupDropdownOpen,
  templates,
  groups,
  waConnected,
  waType,
  channel,
}: {
  form: {
    name: string;
    template_id: string;
    scheduled_at: string;
    stop_at: string;
    recurrence: string;
  };
  setForm: (f: any) => void;
  selectedGroupIds: number[];
  setSelectedGroupIds: (v: number[]) => void;
  selectedDays: number[];
  setSelectedDays: (v: number[]) => void;
  monthDay: number;
  setMonthDay: (v: number) => void;
  groupDropdownOpen: boolean;
  setGroupDropdownOpen: (v: boolean) => void;
  templates: Template[];
  groups: LeadGroup[];
  waConnected: boolean;
  waType: "qr" | "meta" | null;
  channel: "whatsapp" | "email";
}) {
  return (
    <div className="space-y-4">
      {/* Name */}
      <div>
        <label className={LABEL}>Campaign Name <span className="text-red-500">*</span></label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Diwali Offer 2024"
          className={INPUT}
        />
      </div>

      {/* Recurrence mode */}
      <div>
        <label className={LABEL}>Send Mode</label>
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          {(["one_time", "daily", "weekly", "monthly"] as const).map((r) => {
            const labels: Record<string, string> = {
              one_time: "One Time",
              daily: "Daily",
              weekly: "Weekly",
              monthly: "Monthly",
            };
            const active = form.recurrence === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setForm({ ...form, recurrence: r })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Template */}
      <div>
        <label className={LABEL}>
          Template <span className="text-red-500">*</span>
          {channel === "whatsapp" && waConnected && waType && (
            <span className="ml-2 font-normal text-indigo-500 dark:text-indigo-400 normal-case">
              ({waType === "qr" ? "QR connected" : "Meta API connected"} — showing matching templates)
            </span>
          )}
        </label>
        <select
          value={form.template_id}
          onChange={(e) => setForm({ ...form, template_id: e.target.value })}
          className={INPUT}
        >
          <option value="">Select a template</option>
          {templates
            .filter((t) => {
              if (channel === "email") return t.connection_type === "email";
              // whatsapp: filter by wa type if connected, else show all non-email
              const tType = t.connection_type ?? "qr";
              if (tType === "email") return false;
              if (waConnected && waType) return tType === waType;
              return true;
            })
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
        {channel === "whatsapp" && waConnected && waType &&
          templates.filter((t) => (t.connection_type ?? "qr") !== waType && t.connection_type !== "email").length > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Some templates hidden — not compatible with current connection.
            </p>
          )}
      </div>

      {/* Multi-group selector */}
      <div className="relative">
        <label className={LABEL}>
          Lead Groups <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
          className={`${INPUT} flex items-center justify-between text-left`}
        >
          <span className={selectedGroupIds.length === 0 ? "text-gray-400 dark:text-gray-600" : ""}>
            {selectedGroupIds.length === 0
              ? "Select groups…"
              : `${selectedGroupIds.length} group${selectedGroupIds.length > 1 ? "s" : ""} selected`}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${groupDropdownOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {groupDropdownOpen && (
          <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {groups.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-400">No groups yet</p>
              ) : (
                groups.map((g) => {
                  const checked = selectedGroupIds.includes(g.id);
                  return (
                    <label
                      key={g.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedGroupIds(
                            checked
                              ? selectedGroupIds.filter((id) => id !== g.id)
                              : [...selectedGroupIds, g.id],
                          );
                        }}
                        className="w-4 h-4 rounded accent-indigo-600"
                      />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{g.name}</span>
                      <span className="text-xs text-gray-400">{g.member_count} leads</span>
                    </label>
                  );
                })
              )}
            </div>
            {selectedGroupIds.length > 0 && (
              <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {selectedGroupIds.length} group{selectedGroupIds.length > 1 ? "s" : ""} selected ·{" "}
                  {groups.filter((g) => selectedGroupIds.includes(g.id)).reduce((sum, g) => sum + g.member_count, 0)} leads total
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weekly day picker */}
      {form.recurrence === "weekly" && (
        <div>
          <label className={LABEL}>Days of Week</label>
          <div className="flex gap-1.5 flex-wrap">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
              const active = selectedDays.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setSelectedDays(active ? selectedDays.filter((x) => x !== i) : [...selectedDays, i])
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          {selectedDays.length === 0 && (
            <p className="text-xs text-amber-500 mt-1">Select at least one day.</p>
          )}
        </div>
      )}

      {/* Monthly day-of-month picker */}
      {form.recurrence === "monthly" && (
        <div>
          <label className={LABEL}>Day of Month</label>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setMonthDay(d)}
                className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  monthDay === d
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-400"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">Campaign runs on day {monthDay} of every month.</p>
        </div>
      )}

      {/* Start Date */}
      <div>
        <label className={LABEL}>
          {form.recurrence === "one_time" ? "Schedule" : "Start Date & Time"}
        </label>
        <input
          type="datetime-local"
          value={form.scheduled_at}
          onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
          className={INPUT}
        />
      </div>

      {/* Stop Date (only for recurring) */}
      {form.recurrence !== "one_time" && (
        <div>
          <label className={LABEL}>Stop Date (optional)</label>
          <input
            type="datetime-local"
            value={form.stop_at}
            onChange={(e) => setForm({ ...form, stop_at: e.target.value })}
            className={INPUT}
          />
          <p className="text-xs text-gray-400 mt-1">
            Campaign will stop running after this date.
          </p>
        </div>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [groups, setGroups] = useState<LeadGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [waType, setWaType] = useState<"qr" | "meta" | null>(null);
  const [waConnected, setWaConnected] = useState(false);

  // Channel tab
  const [channel, setChannel] = useState<"all" | "whatsapp" | "email">("all");
  // Which channel a new campaign is being created for
  const [createChannel, setCreateChannel] = useState<"whatsapp" | "email">("whatsapp");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createForm, setCreateForm] = useState({ name: "", template_id: "", scheduled_at: "", stop_at: "", recurrence: "one_time" });
  const [createGroupIds, setCreateGroupIds] = useState<number[]>([]);
  const [createGroupDropdown, setCreateGroupDropdown] = useState(false);
  const [createDays, setCreateDays] = useState<number[]>([]);
  const [createMonthDay, setCreateMonthDay] = useState(1);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editError, setEditError] = useState("");
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({ name: "", template_id: "", scheduled_at: "", stop_at: "", recurrence: "one_time" });
  const [editGroupIds, setEditGroupIds] = useState<number[]>([]);
  const [editGroupDropdown, setEditGroupDropdown] = useState(false);
  const [editDays, setEditDays] = useState<number[]>([]);
  const [editMonthDay, setEditMonthDay] = useState(1);

  // Confirm modals
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmStartId, setConfirmStartId] = useState<number | null>(null);
  const [confirmStopId, setConfirmStopId] = useState<number | null>(null);

  // Tags
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagsCampaign, setTagsCampaign] = useState<Campaign | null>(null);
  const [tagsValue, setTagsValue] = useState("");
  const [tagsSaving, setTagsSaving] = useState(false);
  const [tagMgmtOpen, setTagMgmtOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, t, g, wa] = await Promise.all([
        apiGet<Campaign[]>("/campaigns/"),
        apiGet<Template[]>("/templates/"),
        apiGet<LeadGroup[]>("/leads/groups/all"),
        apiGet<WAStatus>("/whatsapp/status"),
      ]);
      setCampaigns(c);
      setTemplates(t);
      setGroups(g);
      setWaType(wa.wa_type ?? null);
      setWaConnected(wa.status === "connected");
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh while any campaign is running
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const hasRunning = campaigns.some(c => c.status === "running");
    if (hasRunning && !pollRef.current) {
      pollRef.current = setInterval(() => {
        load().then(() => {
          if (!campaigns.some(c => c.status === "running")) {
            clearInterval(pollRef.current!);
            pollRef.current = null;
          }
        });
      }, 2000);
    }
    if (!hasRunning && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [campaigns]);

  const buildRecurrenceConfig = (recurrence: string, days: number[], monthDay: number) => {
    if (recurrence === "weekly" && days.length > 0) {
      return JSON.stringify({ days: days.map((d) => DAY_NAMES[d]) });
    }
    if (recurrence === "monthly") {
      return JSON.stringify({ day: monthDay });
    }
    return null;
  };

  // computed
  const visibleCampaigns = campaigns.filter((c) => {
    if (channel === "all") return true;
    if (channel === "email") return c.channel === "email";
    return c.channel !== "email"; // whatsapp tab shows everything that isn't email
  });

  // ── Create ──
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!createForm.name.trim()) { setCreateError("Campaign name is required."); return; }
    if (!createForm.template_id) { setCreateError("Please select a template."); return; }
    if (createGroupIds.length === 0) { setCreateError("Please select at least one lead group."); return; }
    setSaving(true);
    try {
      await apiPost("/campaigns/", {
        name: createForm.name,
        channel: createChannel,
        template_id: createForm.template_id ? +createForm.template_id : null,
        lead_group_id: createGroupIds[0] ?? null,
        lead_group_ids: createGroupIds.length > 0 ? createGroupIds : null,
        scheduled_at: createForm.scheduled_at ? new Date(createForm.scheduled_at).toISOString() : null,
        stop_at: createForm.stop_at ? new Date(createForm.stop_at).toISOString() : null,
        recurrence: createForm.recurrence,
        recurrence_config: buildRecurrenceConfig(createForm.recurrence, createDays, createMonthDay),
      });
      setCreateOpen(false);
      setCreateError("");
      setCreateForm({ name: "", template_id: "", scheduled_at: "", stop_at: "", recurrence: "one_time" });
      setCreateGroupIds([]);
      setCreateDays([]);
      setCreateMonthDay(1);
      load();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create campaign.");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──
  const openEdit = (c: Campaign) => {
    let parsedDays: number[] = [];
    let parsedMonthDay = 1;
    if (c.recurrence_config) {
      try {
        const cfg = JSON.parse(c.recurrence_config);
        if (cfg.days) parsedDays = cfg.days.map((d: string) => DAY_NAMES.indexOf(d)).filter((d: number) => d >= 0);
        if (cfg.day) parsedMonthDay = cfg.day;
      } catch {}
    }
    setEditCampaign(c);
    setEditForm({
      name: c.name,
      template_id: c.template_id ? String(c.template_id) : "",
      scheduled_at: toLocalInput(c.scheduled_at),
      stop_at: toLocalInput(c.stop_at),
      recurrence: c.recurrence || "one_time",
    });
    setEditGroupIds(c.lead_group_ids || (c.lead_group_id ? [c.lead_group_id] : []));
    setEditDays(parsedDays);
    setEditMonthDay(parsedMonthDay);
    setEditGroupDropdown(false);
    setEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCampaign) return;
    setEditError("");
    if (!editForm.name.trim()) { setEditError("Campaign name is required."); return; }
    if (!editForm.template_id) { setEditError("Please select a template."); return; }
    if (editGroupIds.length === 0) { setEditError("Please select at least one lead group."); return; }
    setSaving(true);
    try {
      await apiPut(`/campaigns/${editCampaign.id}`, {
        name: editForm.name,
        template_id: editForm.template_id ? +editForm.template_id : null,
        lead_group_id: editGroupIds[0] ?? null,
        lead_group_ids: editGroupIds.length > 0 ? editGroupIds : null,
        scheduled_at: editForm.scheduled_at ? new Date(editForm.scheduled_at).toISOString() : null,
        stop_at: editForm.stop_at ? new Date(editForm.stop_at).toISOString() : null,
        recurrence: editForm.recurrence,
        recurrence_config: buildRecurrenceConfig(editForm.recurrence, editDays, editMonthDay),
      });
      setEditOpen(false);
      setEditError("");
      setEditCampaign(null);
      setSuccessMsg("Campaign updated.");
      setTimeout(() => setSuccessMsg(""), 4000);
      load();
    } catch (err: any) {
      setEditError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // ── Start ──
  const handleStart = async () => {
    if (!confirmStartId) return;
    setActionError("");
    try {
      await apiPost(`/campaigns/${confirmStartId}/start`);
      setConfirmStartId(null);
      setSuccessMsg("Campaign started! Messages are being sent in the background.");
      setTimeout(() => setSuccessMsg(""), 5000);
      load();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // ── Stop ──
  const handleStop = async () => {
    if (!confirmStopId) return;
    setActionError("");
    try {
      await apiPost(`/campaigns/${confirmStopId}/stop`);
      setConfirmStopId(null);
      setSuccessMsg("Campaign stopped.");
      setTimeout(() => setSuccessMsg(""), 4000);
      load();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // ── Duplicate ──
  const handleDuplicate = async (id: number) => {
    try {
      await apiPost(`/campaigns/${id}/duplicate`);
      setSuccessMsg("Campaign duplicated successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
      load();
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  // ── Delete ──
  const handleDelete = async (id: number) => {
    setDeleteError("");
    try {
      await apiDelete(`/campaigns/${id}`);
      setConfirmDeleteId(null);
      load();
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  const allTags = Array.from(
    new Set(
      campaigns.flatMap((c) =>
        (c.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      ),
    ),
  ).sort();

  const handleSaveTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagsCampaign) return;
    setTagsSaving(true);
    try {
      await apiPut(`/campaigns/${tagsCampaign.id}`, { tags: tagsValue || null });
      setTagsOpen(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTagsSaving(false);
    }
  };

  const handleRemoveTagFromCampaign = async (campaign: Campaign, tag: string) => {
    const current = (campaign.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const updated = current.filter((t) => t !== tag).join(", ") || null;
    try {
      await apiPut(`/campaigns/${campaign.id}`, { tags: updated });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const actionProps = (c: Campaign) => ({
    c,
    onStart: () => { setActionError(""); setConfirmStartId(c.id); },
    onStop: () => { setActionError(""); setConfirmStopId(c.id); },
    onEdit: () => openEdit(c),
    onDuplicate: () => handleDuplicate(c.id),
    onDelete: () => { setDeleteError(""); setConfirmDeleteId(c.id); },
    onTags: () => { setTagsCampaign(c); setTagsValue(c.tags ?? ""); setTagsOpen(true); },
  });

  const waCampaignCount = campaigns.filter((c) => c.channel !== "email").length;
  const emailCampaignCount = campaigns.filter((c) => c.channel === "email").length;

  const openCreate = (ch: "whatsapp" | "email") => {
    setCreateChannel(ch);
    setCreateForm({ name: "", template_id: "", scheduled_at: "", stop_at: "", recurrence: "one_time" });
    setCreateGroupIds([]);
    setCreateDays([]);
    setCreateMonthDay(1);
    setCreateGroupDropdown(false);
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header + Tab Switcher + Buttons — single row, switcher truly centered */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Left: title */}
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">
            WhatsApp &amp; Email campaigns
          </p>
        </div>

        {/* Center: tab switcher */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl shrink-0">
          {(["all", "whatsapp", "email"] as const).map((tab) => {
            const active = channel === tab;
            const label = tab === "all" ? "All" : tab === "whatsapp" ? "WhatsApp" : "Email";
            const count = tab === "all" ? campaigns.length : tab === "whatsapp" ? waCampaignCount : emailCampaignCount;
            return (
              <button
                key={tab}
                onClick={() => setChannel(tab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              >
                {tab === "all" && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                )}
                {tab === "whatsapp" && (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                )}
                {tab === "email" && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="hidden sm:inline">{label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  active ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
                         : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-2 justify-end">
          {allTags.length > 0 && (
            <button onClick={() => { setTagMgmtOpen(true); setSelectedTag(allTags[0]); }} className={BTN_GHOST}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="hidden lg:inline">Manage Tags</span>
            </button>
          )}
          {channel === "all" ? (
            <>
              <button onClick={() => openCreate("whatsapp")} className={BTN_GHOST}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
              <button onClick={() => openCreate("email")} className={BTN_PRIMARY}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Email</span>
              </button>
            </>
          ) : (
            <button onClick={() => openCreate(channel)} className={BTN_PRIMARY}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">New</span>
            </button>
          )}
        </div>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-emerald-400 hover:text-emerald-600 ml-4">✕</button>
        </div>
      )}
      {deleteError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError("")} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : visibleCampaigns.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <EmptyState
            title={channel === "email" ? "No email campaigns yet" : channel === "whatsapp" ? "No WhatsApp campaigns yet" : "No campaigns yet"}
            description={channel === "email" ? "Create an email campaign to start sending via SMTP." : "Create your first campaign to start reaching your leads."}
            action={
              channel === "all"
                ? <div className="flex gap-2"><button onClick={() => openCreate("whatsapp")} className={BTN_GHOST}>WhatsApp Campaign</button><button onClick={() => openCreate("email")} className={BTN_PRIMARY}>Email Campaign</button></div>
                : <button onClick={() => openCreate(channel)} className={BTN_PRIMARY}>Create Campaign</button>
            }
          />
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60">
                <tr>
                  {["Campaign", "Channel", "Template", "Group", "Recurrence", "Next Run", "Status", "Sent", ""].map((h) => (
                    <th
                      key={h}
                      className={`text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider first:rounded-tl-2xl last:rounded-tr-2xl ${h === "" ? "w-px" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {c.name}
                      </Link>
                      {c.tags && (
                        <div className="flex gap-1 flex-wrap mt-1">
                          {c.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.channel === "email" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Email
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{c.template_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {c.lead_group_names && c.lead_group_names.length > 1
                        ? `${c.lead_group_names.length} groups`
                        : c.lead_group_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`font-medium ${isRecurring(c) ? "text-indigo-500 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
                        {fmtRecurrence(c)}
                      </span>
                      {c.stop_at && (
                        <div className="text-gray-400 dark:text-gray-600 mt-0.5">
                          Stops {fmt(c.stop_at)}
                        </div>
                      )}
                    </td>
                    <td suppressHydrationWarning className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                      {isRecurring(c) && c.status === "scheduled"
                        ? <span className="text-emerald-500 dark:text-emerald-400 font-medium">{fmt(c.scheduled_at)}</span>
                        : fmt(c.scheduled_at)}
                    </td>
                    <td className="px-4 py-3"><Badge label={c.status} /></td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">{c.messages_sent ?? 0}</td>
                    <td className="px-4 py-3 w-px whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <CampaignActions {...actionProps(c)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {visibleCampaigns.map((c) => (
              <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="font-semibold text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-sm block truncate"
                      >
                        {c.name}
                      </Link>
                      {c.channel === "email" ? (
                        <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800">Email</span>
                      ) : (
                        <span className="shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">WA</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                      {c.template_name || "No template"} ·{" "}
                      {c.lead_group_names && c.lead_group_names.length > 1
                        ? `${c.lead_group_names.length} groups`
                        : c.lead_group_name || "No group"}
                    </p>
                  </div>
                  <Badge label={c.status} />
                </div>
                {c.tags && (
                  <div className="flex gap-1 flex-wrap">
                    {c.tags.split(",").map((t) => t.trim()).filter(Boolean).map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    <span className="font-semibold text-gray-900 dark:text-white">{c.messages_sent ?? 0}</span> sent
                    {(c.messages_failed ?? 0) > 0 && <span className="text-red-500 ml-1">· {c.messages_failed} failed</span>}
                  </span>
                  <span className={isRecurring(c) ? "text-indigo-500 dark:text-indigo-400 font-medium" : ""}>
                    {fmtRecurrence(c)}
                  </span>
                  {c.scheduled_at && (
                    <span suppressHydrationWarning className="truncate">
                      {isRecurring(c) && c.status === "scheduled" ? "Next: " : ""}{fmt(c.scheduled_at)}
                    </span>
                  )}
                </div>
                <CampaignActions {...actionProps(c)} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Create Campaign Modal ── */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setCreateGroupDropdown(false); setCreateError(""); }} title={createChannel === "email" ? "New Email Campaign" : "New WhatsApp Campaign"} wide>
        <form onSubmit={handleCreate} className="space-y-4">
          {createError && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              {createError}
            </div>
          )}
          <div className="overflow-y-auto max-h-[65vh] pr-1">
            <CampaignFormBody
              form={createForm}
              setForm={setCreateForm}
              selectedGroupIds={createGroupIds}
              setSelectedGroupIds={setCreateGroupIds}
              selectedDays={createDays}
              setSelectedDays={setCreateDays}
              monthDay={createMonthDay}
              setMonthDay={setCreateMonthDay}
              groupDropdownOpen={createGroupDropdown}
              setGroupDropdownOpen={setCreateGroupDropdown}
              templates={templates}
              groups={groups}
              waConnected={waConnected}
              waType={waType}
              channel={createChannel}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className={`${BTN_GHOST} flex-1`}>Cancel</button>
            <button type="submit" disabled={saving} className={`${BTN_PRIMARY} flex-1`}>
              {saving && <Spinner className="text-white" />}Create
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Campaign Modal ── */}
      <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditCampaign(null); setEditGroupDropdown(false); setEditError(""); }} title="Edit Campaign" wide>
        <form onSubmit={handleEdit} className="space-y-4">
          {editError && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
              {editError}
            </div>
          )}
          <div className="overflow-y-auto max-h-[65vh] pr-1">
            <CampaignFormBody
              form={editForm}
              setForm={setEditForm}
              selectedGroupIds={editGroupIds}
              setSelectedGroupIds={setEditGroupIds}
              selectedDays={editDays}
              setSelectedDays={setEditDays}
              monthDay={editMonthDay}
              setMonthDay={setEditMonthDay}
              groupDropdownOpen={editGroupDropdown}
              setGroupDropdownOpen={setEditGroupDropdown}
              templates={templates}
              groups={groups}
              waConnected={waConnected}
              waType={waType}
              channel={editCampaign?.channel === "email" ? "email" : "whatsapp"}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => { setEditOpen(false); setEditCampaign(null); }} className={`${BTN_GHOST} flex-1`}>Cancel</button>
            <button type="submit" disabled={saving} className={`${BTN_PRIMARY} flex-1`}>
              {saving && <Spinner className="text-white" />}Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Start Confirm Modal ── */}
      <Modal open={confirmStartId !== null} onClose={() => setConfirmStartId(null)} title="Start Campaign">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {campaigns.find((c) => c.id === confirmStartId)?.channel === "email"
              ? "This will immediately send emails to all leads with an email address in the selected group. Make sure your Email is connected first."
              : "This will immediately send messages to all leads in the selected group. Make sure your WhatsApp is connected first."}
          </p>
          {actionError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{actionError}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setConfirmStartId(null)} className={`${BTN_GHOST} flex-1`}>Cancel</button>
            <button
              onClick={handleStart}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Yes, Start Now
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Stop Confirm Modal ── */}
      <Modal open={confirmStopId !== null} onClose={() => setConfirmStopId(null)} title="Stop Campaign">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will stop the campaign and cancel any upcoming scheduled runs. It will be moved back to draft status and can be restarted or rescheduled later.
          </p>
          {actionError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{actionError}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setConfirmStopId(null)} className={`${BTN_GHOST} flex-1`}>Cancel</button>
            <button
              onClick={handleStop}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Yes, Stop
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal open={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} title="Delete Campaign">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this campaign? All message logs will also be deleted.
          </p>
          {deleteError && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{deleteError}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setConfirmDeleteId(null)} className={`${BTN_GHOST} flex-1`}>Cancel</button>
            <button
              onClick={() => { if (confirmDeleteId) handleDelete(confirmDeleteId); }}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Quick Tags Modal ── */}
      <Modal open={tagsOpen} onClose={() => setTagsOpen(false)} title="Edit Tags">
        <form onSubmit={handleSaveTags} className="space-y-4">
          <div>
            <label className={LABEL}>
              Tags for <span className="text-gray-700 dark:text-gray-300">{tagsCampaign?.name}</span>
            </label>
            <input
              value={tagsValue}
              onChange={(e) => setTagsValue(e.target.value)}
              placeholder="e.g. promotional, festival, reminder"
              className={INPUT}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">Comma-separated. Used for personal organisation only.</p>
          </div>
          {(() => {
            const currentTags = new Set(tagsValue.split(",").map((s) => s.trim()).filter(Boolean));
            const suggestions = allTags.filter((t) => !currentTags.has(t));
            if (suggestions.length === 0) return null;
            return (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Existing Tags</p>
                <div className="flex gap-1.5 flex-wrap">
                  {suggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagsValue((prev) => prev.trim() ? `${prev.trim()}, ${tag}` : tag)}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-200 dark:hover:border-violet-700 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {tagsValue && (
            <div className="flex gap-1.5 flex-wrap">
              {tagsValue.split(",").map((tag) => tag.trim()).filter(Boolean).map((tag) => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setTagsOpen(false)} className={`${BTN_GHOST} flex-1`}>Cancel</button>
            <button type="submit" disabled={tagsSaving} className={`${BTN_PRIMARY} flex-1`}>
              {tagsSaving && <Spinner className="text-white" />}Save Tags
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Tag Management Modal ── */}
      <Modal open={tagMgmtOpen} onClose={() => setTagMgmtOpen(false)} wide title="Manage Tags">
        <div className="flex gap-5 min-h-[50vh]">
          <div className="w-48 shrink-0 border-r border-gray-100 dark:border-gray-800 pr-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">All Tags</p>
            {allTags.length === 0 && (
              <p className="text-xs text-gray-400">No tags yet. Add tags using the Tags button on a campaign.</p>
            )}
            {allTags.map((tag) => {
              const count = campaigns.filter((c) =>
                (c.tags ?? "").split(",").map((s) => s.trim()).includes(tag),
              ).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedTag === tag
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="truncate">{tag}</span>
                  <span className={`text-xs ml-1 shrink-0 ${selectedTag === tag ? "text-violet-200" : "text-gray-400"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1 min-w-0">
            {selectedTag ? (
              <>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Campaigns tagged <span className="text-violet-600 dark:text-violet-400">{selectedTag}</span>
                </p>
                <div className="space-y-2">
                  {campaigns
                    .filter((c) => (c.tags ?? "").split(",").map((s) => s.trim()).includes(selectedTag))
                    .map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.name}</p>
                          <p className="text-xs text-gray-400 truncate">{c.template_name || "No template"}</p>
                        </div>
                        <button
                          onClick={async () => {
                            await handleRemoveTagFromCampaign(c, selectedTag);
                            const remaining = campaigns.filter(
                              (x) => x.id !== c.id && (x.tags ?? "").split(",").map((s) => s.trim()).includes(selectedTag),
                            );
                            if (remaining.length === 0) {
                              const next = allTags.filter((t) => t !== selectedTag)[0] ?? null;
                              setSelectedTag(next);
                              if (!next) setTagMgmtOpen(false);
                            }
                          }}
                          className="shrink-0 text-xs px-2 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 mt-4">Select a tag to see campaigns.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
