"use client";

import { useEffect, useState, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import WhatsAppStatusButton from "@/components/layout/WhatsAppStatusButton";
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "@/lib/api";
import type { Template, WAStatus } from "@/lib/types";

const INPUT =
  "w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all";
const BTN_P =
  "flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-indigo-500/25";
const BTN_G =
  "flex items-center justify-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all";

const QR_VARS = [
  { label: "Name", value: "{{name}}" },
  { label: "Phone", value: "{{phone}}" },
  { label: "Email", value: "{{email}}" },
  { label: "Company Name", value: "{{company_name}}" },
  { label: "City", value: "{{city}}" },
  { label: "State", value: "{{state}}" },
  { label: "Country", value: "{{country}}" },
  { label: "Pincode", value: "{{pincode}}" },
  { label: "Tags", value: "{{tags}}" },
];

const META_FIELD_OPTIONS = [
  { label: "— select field —", value: "" },
  { label: "Name", value: "name" },
  { label: "Phone", value: "phone" },
  { label: "Email", value: "email" },
  { label: "Company Name", value: "company_name" },
  { label: "Address (Line 1 + 2 + 3)", value: "address" },
  { label: "City", value: "city" },
  { label: "State", value: "state" },
  { label: "Country", value: "country" },
  { label: "Pincode", value: "pincode" },
  { label: "Tags", value: "tags" },
];

const META_FIELD_SAMPLES: Record<string, string> = {
  name: "Ramesh Kumar",
  phone: "+919876543210",
  email: "ramesh@example.com",
  company_name: "Acme Corp",
  address: "No 14A, 5th Main, Jayamahal",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  pincode: "560046",
  tags: "VIP",
};

const prev = (b: string) =>
  b
    .replace(/{{name}}/g, "Ramesh Kumar")
    .replace(/{{phone}}/g, "+919876543210")
    .replace(/{{email}}/g, "ramesh@example.com")
    .replace(/{{company_name}}/g, "Acme Corp")
    .replace(/{{city}}/g, "Mumbai")
    .replace(/{{state}}/g, "Maharashtra")
    .replace(/{{country}}/g, "India")
    .replace(/{{pincode}}/g, "400001")
    .replace(/{{tags}}/g, "VIP")
    .replace(/{{1}}/g, "Ramesh")
    .replace(/{{2}}/g, "Order #1234")
    .replace(/{{3}}/g, "₹999")
    .replace(/{{4}}/g, "Tomorrow");

const toDirectImageUrl = (url: string): string => {
  const match = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
};

const CATEGORIES = [
  {
    value: "MARKETING",
    label: "Marketing",
    color:
      "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  },
  {
    value: "UTILITY",
    label: "Utility",
    color:
      "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  {
    value: "AUTHENTICATION",
    label: "Authentication",
    color:
      "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  },
];

const STATUSES = {
  APPROVED:
    "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  PENDING:
    "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  REJECTED:
    "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800",
  PAUSED:
    "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

function VarDropdown({ onSelect }: { onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
      >
        Insert variable
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-52 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          <p className="px-3 py-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
            Lead fields
          </p>
          {QR_VARS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => {
                onSelect(v.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
            >
              <span className="text-sm text-gray-700 dark:text-gray-200">{v.label}</span>
              <span className="text-xs font-mono text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                {v.value}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryBadge({ category }: { category?: string }) {
  const cat = CATEGORIES.find((c) => c.value === category);
  if (!cat) return null;
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cat.color}`}
    >
      {cat.label}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const cls = STATUSES[status as keyof typeof STATUSES] || STATUSES.PENDING;
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}
    >
      {status ?? "PENDING"}
    </span>
  );
}

export default function TemplatesPage() {
  const [waType, setWaType] = useState<"qr" | "meta">("qr");
  const [waConnected, setWaConnected] = useState(false);
  const [waForceOpen, setWaForceOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  // QR form
  const [qrForm, setQrForm] = useState({ name: "", body: "", tags: "" });
  // Meta create form
  const [metaForm, setMetaForm] = useState({
    name: "",
    meta_template_name: "",
    category: "MARKETING",
    body: "",
    header: "",
    footer: "",
  });
  const [metaHeaderType, setMetaHeaderType] = useState<
    "none" | "text" | "image"
  >("none");
  const [metaHeaderImageUrl, setMetaHeaderImageUrl] = useState("");
  const [metaVarSamples, setMetaVarSamples] = useState<string[]>([]);
  const metaBodyRef = useRef<HTMLTextAreaElement>(null);
  const qrBodyRef = useRef<HTMLTextAreaElement>(null);
  const [metaVarMap, setMetaVarMap] = useState<Record<string, string>>({});
  const [metaButtons, setMetaButtons] = useState<
    { type: string; text: string; url: string; phone_number: string }[]
  >([]);
  const [metaError, setMetaError] = useState("");
  // Meta edit (name + tags + body + variable map)
  const [metaEditOpen, setMetaEditOpen] = useState(false);
  const [metaEditTemplate, setMetaEditTemplate] = useState<Template | null>(
    null,
  );
  const [metaEditForm, setMetaEditForm] = useState({
    name: "",
    tags: "",
    body: "",
  });
  const [metaEditVarMap, setMetaEditVarMap] = useState<Record<string, string>>({});
  const [metaEditSaving, setMetaEditSaving] = useState(false);
  // Quick tags modal (any template)
  const [tagsOpen, setTagsOpen] = useState(false);
  const [tagsTemplate, setTagsTemplate] = useState<Template | null>(null);
  const [tagsValue, setTagsValue] = useState("");
  const [tagsSaving, setTagsSaving] = useState(false);
  // Tag management panel
  const [tagMgmtOpen, setTagMgmtOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  // Image upload
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const status = await apiGet<WAStatus>("/whatsapp/status");
      setWaType(status.wa_type ?? "qr");
      const connected = status.status === "connected";
      setWaConnected(connected);
      if (connected) {
        const tmpl = await apiGet<Template[]>("/templates/");
        setTemplates(tmpl);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const isMetaMode = waType === "meta";

  // Filter templates by current mode
  const visibleTemplates = templates.filter((t) =>
    isMetaMode ? t.connection_type === "meta" : t.connection_type !== "meta",
  );

  const openNew = () => {
    setEditing(null);
    setQrForm({ name: "", body: "", tags: "" });
    setMetaForm({
      name: "",
      meta_template_name: "",
      category: "MARKETING",
      body: "",
      header: "",
      footer: "",
    });
    setMetaHeaderType("none");
    setMetaHeaderImageUrl("");
    setMetaVarSamples([]);
    setMetaVarMap({});
    setMetaButtons([]);
    setMetaError("");
    setOpen(true);
  };

  const openMetaEdit = (t: Template) => {
    setMetaEditTemplate(t);
    setMetaEditForm({ name: t.name, tags: t.tags ?? "", body: t.body });
    // Parse existing variable map, then fill in any numbered vars from body that are missing
    const existingMap: Record<string, string> = {};
    if (t.meta_variable_map) {
      try { Object.assign(existingMap, JSON.parse(t.meta_variable_map)); } catch {}
    }
    const nums = [...(t.body.match(/\{\{(\d+)\}\}/g) || [])].map((m) => m.replace(/\{|\}/g, ""));
    for (const n of nums) { if (!(n in existingMap)) existingMap[n] = ""; }
    setMetaEditVarMap(existingMap);
    setMetaEditOpen(true);
  };

  const handleSaveMetaEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metaEditTemplate) return;
    setMetaEditSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: metaEditForm.name,
        tags: metaEditForm.tags || null,
        body: metaEditForm.body,
      };
      if (Object.keys(metaEditVarMap).length > 0) {
        payload.meta_variable_map = JSON.stringify(metaEditVarMap);
      }
      await apiPut(`/templates/${metaEditTemplate.id}`, payload);
      setMetaEditOpen(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setMetaEditSaving(false);
    }
  };

  const openTagsEdit = (t: Template) => {
    setTagsTemplate(t);
    setTagsValue(t.tags ?? "");
    setTagsOpen(true);
  };

  const handleSaveTags = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagsTemplate) return;
    setTagsSaving(true);
    try {
      await apiPut(`/templates/${tagsTemplate.id}`, {
        tags: tagsValue || null,
      });
      setTagsOpen(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTagsSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploadingImage(true);
    try {
      const res = await apiUpload<{ url: string }>("/upload/image", file);
      setMetaHeaderImageUrl(res.url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Derived: all unique tags across visible templates
  const allTags = Array.from(
    new Set(
      visibleTemplates.flatMap((t) =>
        (t.tags ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ),
  ).sort();

  const openEdit = (t: Template) => {
    setEditing(t);
    setQrForm({ name: t.name, body: t.body, tags: t.tags ?? "" });
    setOpen(true);
  };

  const handleSaveQR = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: qrForm.name,
        body: qrForm.body,
        tags: qrForm.tags || null,
      };
      editing
        ? await apiPut(`/templates/${editing.id}`, payload)
        : await apiPost("/templates/", payload);
      setOpen(false);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Count {{N}} variables in body and keep varSamples + varMap in sync
  const syncVarSamples = (body: string, prev: string[]) => {
    const matches = body.match(/\{\{\d+\}\}/g) || [];
    const max = matches.reduce(
      (m, v) => Math.max(m, parseInt(v.replace(/\D/g, ""))),
      0,
    );
    const next = Array.from({ length: max }, (_, i) => prev[i] ?? "");
    setMetaVarSamples(next);
    setMetaVarMap((prevMap) => {
      const nextMap: Record<string, string> = {};
      for (let i = 1; i <= max; i++) nextMap[String(i)] = prevMap[String(i)] ?? "";
      return nextMap;
    });
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setMetaError("");
    const metaName = metaForm.meta_template_name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    if (!/^[a-z0-9_]+$/.test(metaName)) {
      setMetaError(
        "Template name must be lowercase letters, numbers and underscores only.",
      );
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: metaForm.name,
        meta_template_name: metaName,
        category: metaForm.category,
        body: metaForm.body,
      };
      if (metaHeaderType === "text" && metaForm.header.trim())
        payload.header = metaForm.header.trim();
      if (metaHeaderType === "image" && metaHeaderImageUrl.trim())
        payload.header_image_url = metaHeaderImageUrl.trim();
      if (metaForm.footer.trim()) payload.footer = metaForm.footer.trim();
      if (metaVarSamples.some((s) => s.trim()))
        payload.variable_samples = metaVarSamples.map(
          (s) => s.trim() || `value${metaVarSamples.indexOf(s) + 1}`,
        );
      if (Object.values(metaVarMap).some((v) => v))
        payload.meta_variable_map = JSON.stringify(metaVarMap);
      if (metaButtons.length)
        payload.buttons = metaButtons.map(
          ({ type, text, url, phone_number }) => ({
            type,
            text,
            ...(type === "URL"
              ? { url }
              : type === "PHONE_NUMBER"
                ? { phone_number }
                : {}),
          }),
        );
      await apiPost("/templates/meta", payload);
      setOpen(false);
      load();
    } catch (err: any) {
      setMetaError(err.message || "Failed to submit template for approval.");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await apiPost("/templates/meta/sync");
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshStatus = async (id: number) => {
    try {
      await apiPost(`/templates/meta/${id}/refresh`);
      load();
    } catch {}
  };

  const handleDelete = async (id: number) => {
    setDeleteError("");
    try {
      await apiDelete(`/templates/${id}`);
      setConfirmDeleteId(null);
      load();
    } catch (err: any) {
      setDeleteError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!waConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-400 dark:text-gray-500"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.214l4.297-1.376A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.25 0-4.348-.634-6.131-1.733l-.44-.262-2.551.818.832-2.487-.287-.468A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Connect WhatsApp first
          </h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
            You need an active WhatsApp connection to view and create templates.
          </p>
        </div>
        <button
          onClick={() => {
            setWaForceOpen(true);
            setTimeout(() => setWaForceOpen(false), 200);
          }}
          className="flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-indigo-500/25"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.786 23.214l4.297-1.376A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.25 0-4.348-.634-6.131-1.733l-.44-.262-2.551.818.832-2.487-.287-.468A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
          Connect WhatsApp
        </button>
        <WhatsAppStatusButton
          hideButton
          forceOpen={waForceOpen}
          onOpen={load}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Templates
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {isMetaMode
              ? "Meta Business API templates — submitted for approval by Meta"
              : "Reusable WhatsApp message templates with dynamic variables"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allTags.length > 0 && (
            <button
              onClick={() => {
                setTagMgmtOpen(true);
                setSelectedTag(allTags[0]);
              }}
              className={BTN_G}
            >
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
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              Manage Tags
            </button>
          )}
          {isMetaMode && (
            <button onClick={handleSync} disabled={syncing} className={BTN_G}>
              {syncing ? (
                <Spinner />
              ) : (
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              Sync from Meta
            </button>
          )}
          <button onClick={openNew} className={BTN_P}>
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
            New Template
          </button>
        </div>
      </div>

      {/* Mode indicator */}
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold ${
          isMetaMode
            ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
            : "bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400"
        }`}
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {isMetaMode
          ? "You are connected via Meta Business API. Templates require Meta approval before use."
          : "You are connected via QR Code. Templates are sent directly without approval."}
      </div>

      {visibleTemplates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <EmptyState
            title={isMetaMode ? "No Meta templates yet" : "No templates yet"}
            description={
              isMetaMode
                ? "Create a template and submit it to Meta for approval, or sync existing ones."
                : "Create templates with dynamic variables like {{name}} and {{phone}} for personalized messaging."
            }
            action={
              <div className="flex gap-2">
                {isMetaMode && (
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className={BTN_G}
                  >
                    {syncing ? <Spinner /> : "Sync from Meta"}
                  </button>
                )}
                <button onClick={openNew} className={BTN_P}>
                  {isMetaMode ? "Create & Submit" : "Create Template"}
                </button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleTemplates.map((t) => (
            <div
              key={t.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-4 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-gray-950/60 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 grad-3">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {t.name}
                    </h3>
                    {t.meta_template_name && (
                      <p className="text-xs text-gray-400 font-mono truncate">
                        {t.meta_template_name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0 items-center flex-wrap justify-end">
                  {isMetaMode && (
                    <button
                      onClick={() => handleRefreshStatus(t.id)}
                      title="Refresh status"
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => (isMetaMode ? openMetaEdit(t) : openEdit(t))}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openTagsEdit(t)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  >
                    Tags
                  </button>
                  <button
                    onClick={() => {
                      setDeleteError("");
                      setConfirmDeleteId(t.id);
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Meta badges */}
              {isMetaMode && (
                <div className="flex items-center gap-2 flex-wrap">
                  <CategoryBadge category={t.meta_category} />
                  <StatusBadge status={t.meta_status} />
                  {t.meta_language && (
                    <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">
                      {t.meta_language}
                    </span>
                  )}
                </div>
              )}

              {/* Tags (both QR and Meta) */}
              {t.tags && (
                <div className="flex gap-1.5 flex-wrap">
                  {t.tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              )}

              {/* WhatsApp bubble preview */}
              <div className="rounded-xl bg-[#e5ddd5] dark:bg-[#0b1413] p-3 mt-1">
                {t.meta_header_image_url && (
                  <img
                    src={toDirectImageUrl(t.meta_header_image_url)}
                    alt="Header"
                    className="w-full h-28 object-cover rounded-xl mb-2"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm max-h-40 overflow-hidden relative">
                  <p className="text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed line-clamp-6">
                    {prev(t.body)}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 text-right mt-1">
                    12:00 PM ✓✓
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white dark:from-[#1f2c34] to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete Template"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isMetaMode
              ? "This will remove the template from this app. It will NOT be deleted from Meta Business Manager."
              : "Delete this template? Campaigns using it will lose their template reference."}
          </p>
          {deleteError && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {deleteError}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (confirmDeleteId) handleDelete(confirmDeleteId);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        wide={isMetaMode}
        title={
          isMetaMode
            ? "New Meta Template"
            : editing
              ? "Edit Template"
              : "New Template"
        }
      >
        {isMetaMode ? (
          /* ── Meta Template Form — two columns ── */
          <form onSubmit={handleSaveMeta} className="flex gap-6 max-h-[78vh]">
            {/* Left: form fields */}
            <div className="flex-1 min-w-0 overflow-y-auto space-y-4 pr-2">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Display Name *
                </label>
                <input
                  required
                  value={metaForm.name}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, name: e.target.value })
                  }
                  placeholder="e.g. Order Confirmation"
                  className={INPUT}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Template Name (snake_case) *
                </label>
                <p className="text-xs text-gray-400 mb-1.5">
                  Lowercase, numbers, underscores only. Cannot change after
                  approval.
                </p>
                <input
                  required
                  value={metaForm.meta_template_name}
                  onChange={(e) =>
                    setMetaForm({
                      ...metaForm,
                      meta_template_name: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "_"),
                    })
                  }
                  placeholder="e.g. order_confirmation"
                  className={`${INPUT} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Category *
                </label>
                <select
                  value={metaForm.category}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, category: e.target.value })
                  }
                  className={INPUT}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Header with type selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Header{" "}
                  <span className="font-normal text-gray-400">· Optional</span>
                </label>
                <div className="flex gap-2 mb-2">
                  {(["none", "text", "image"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMetaHeaderType(t)}
                      className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all capitalize ${metaHeaderType === t ? "bg-indigo-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {metaHeaderType === "text" && (
                  <>
                    <input
                      value={metaForm.header}
                      onChange={(e) =>
                        setMetaForm({ ...metaForm, header: e.target.value })
                      }
                      placeholder="Short header line"
                      maxLength={60}
                      className={INPUT}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {metaForm.header.length}/60
                    </p>
                  </>
                )}
                {metaHeaderType === "image" && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const f = e.dataTransfer.files[0];
                      if (f) handleImageUpload(f);
                    }}
                    className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${dragOver ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-gray-300 dark:border-gray-700 hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}
                    onClick={() =>
                      document.getElementById("header-img-input")?.click()
                    }
                  >
                    <input
                      id="header-img-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                    />
                    {metaHeaderImageUrl ? (
                      <div className="relative">
                        <img
                          src={toDirectImageUrl(metaHeaderImageUrl)}
                          alt="Header"
                          className="w-full h-36 object-cover rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMetaHeaderImageUrl("");
                          }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500 transition-all"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                        {uploadingImage ? (
                          <Spinner />
                        ) : (
                          <>
                            <svg
                              className="w-8 h-8 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                              />
                            </svg>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Drag & drop or click to upload
                            </p>
                            <p className="text-[10px] text-gray-400">
                              JPG, PNG, WebP, GIF
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Body *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const body = metaForm.body;
                      const matches = body.match(/\{\{(\d+)\}\}/g) || [];
                      const nums = matches.map((m) => parseInt(m.replace(/\{|\}/g, "")));
                      const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
                      const varStr = `{{${nextNum}}}`;
                      const textarea = metaBodyRef.current;
                      let newBody: string;
                      if (textarea) {
                        const s = textarea.selectionStart;
                        const e = textarea.selectionEnd;
                        newBody = body.slice(0, s) + varStr + body.slice(e);
                        requestAnimationFrame(() => {
                          textarea.selectionStart = s + varStr.length;
                          textarea.selectionEnd = s + varStr.length;
                          textarea.focus();
                        });
                      } else {
                        newBody = body + varStr;
                      }
                      setMetaForm((f) => ({ ...f, body: newBody }));
                      syncVarSamples(newBody, metaVarSamples);
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all flex items-center gap-1"
                  >
                    <span className="text-base leading-none">+</span> Add Variable
                  </button>
                </div>
                <textarea
                  ref={metaBodyRef}
                  required
                  value={metaForm.body}
                  onChange={(e) => {
                    setMetaForm((f) => ({ ...f, body: e.target.value }));
                    syncVarSamples(e.target.value, metaVarSamples);
                  }}
                  rows={5}
                  maxLength={1024}
                  placeholder={
                    "Hi {{1}},\n\nYour order {{2}} is confirmed for ₹{{3}}."
                  }
                  className={`${INPUT} resize-none font-mono text-xs`}
                />
                <p className="text-xs text-gray-400 mt-1 flex justify-between">
                  <span>
                    Click "Add Variable" to insert {"{{1}}"}, {"{{2}}"} etc. at cursor.
                  </span>
                  <span>{metaForm.body.length}/1024</span>
                </p>
              </div>

              {/* Variable samples + mapping */}
              {metaVarSamples.length > 0 && (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/10 p-3 space-y-2">
                  <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    Sample values{" "}
                    <span className="font-normal text-indigo-500">
                      · Select the lead field for each variable
                    </span>
                  </p>
                  {metaVarSamples.map((_val, i) => {
                    const num = String(i + 1);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-indigo-500 dark:text-indigo-400 w-8 shrink-0">{`{{${num}}}`}</span>
                        <select
                          value={metaVarMap[num] ?? ""}
                          onChange={(e) => {
                            const field = e.target.value;
                            setMetaVarMap((prev) => ({ ...prev, [num]: field }));
                            const next = [...metaVarSamples];
                            next[i] = field ? (META_FIELD_SAMPLES[field] ?? field) : "";
                            setMetaVarSamples(next);
                          }}
                          className={`${INPUT} py-1.5 text-xs flex-1`}
                        >
                          {META_FIELD_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  Footer{" "}
                  <span className="font-normal text-gray-400">· Optional</span>
                </label>
                <input
                  value={metaForm.footer}
                  onChange={(e) =>
                    setMetaForm({ ...metaForm, footer: e.target.value })
                  }
                  placeholder="e.g. Not interested? Reply STOP"
                  maxLength={60}
                  className={INPUT}
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {metaForm.footer.length}/60
                </p>
              </div>

              {/* Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    Buttons{" "}
                    <span className="font-normal text-gray-400">
                      · Optional
                    </span>
                  </label>
                  {metaButtons.length < 10 && (
                    <div className="flex gap-1">
                      {[
                        { type: "QUICK_REPLY", label: "+ Reply" },
                        { type: "URL", label: "+ URL" },
                        { type: "PHONE_NUMBER", label: "+ Phone" },
                      ].map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          onClick={() =>
                            setMetaButtons((b) => [
                              ...b,
                              {
                                type: opt.type,
                                text: "",
                                url: "",
                                phone_number: "",
                              },
                            ])
                          }
                          className="text-xs px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all font-medium"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {metaButtons.length > 0 && (
                  <div className="space-y-2">
                    {metaButtons.map((btn, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      >
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-2.5 w-12 shrink-0">
                          {btn.type === "QUICK_REPLY"
                            ? "Reply"
                            : btn.type === "URL"
                              ? "URL"
                              : "Phone"}
                        </span>
                        <div className="flex-1 space-y-1.5">
                          <input
                            value={btn.text}
                            onChange={(e) => {
                              const next = [...metaButtons];
                              next[i] = { ...next[i], text: e.target.value };
                              setMetaButtons(next);
                            }}
                            placeholder="Button label"
                            maxLength={25}
                            className={`${INPUT} py-1.5 text-xs`}
                          />
                          {btn.type === "URL" && (
                            <input
                              value={btn.url}
                              onChange={(e) => {
                                const next = [...metaButtons];
                                next[i] = { ...next[i], url: e.target.value };
                                setMetaButtons(next);
                              }}
                              placeholder="https://example.com"
                              className={`${INPUT} py-1.5 text-xs`}
                            />
                          )}
                          {btn.type === "PHONE_NUMBER" && (
                            <input
                              value={btn.phone_number}
                              onChange={(e) => {
                                const next = [...metaButtons];
                                next[i] = {
                                  ...next[i],
                                  phone_number: e.target.value,
                                };
                                setMetaButtons(next);
                              }}
                              placeholder="+91 98765 43210"
                              className={`${INPUT} py-1.5 text-xs`}
                            />
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setMetaButtons((b) => b.filter((_, j) => j !== i))
                          }
                          className="text-gray-400 hover:text-red-500 transition-colors mt-2"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-gray-400">
                      {metaButtons.length}/10 · More than 3 buttons appear as a
                      list.
                    </p>
                  </div>
                )}
              </div>

              {metaError && (
                <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                  {metaError}
                </p>
              )}
              <div className="rounded-xl p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                This template will be submitted to Meta for review. Approval
                usually takes a few minutes to 24 hours.
              </div>
              <div className="flex gap-3 pt-1 pb-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={`${BTN_G} flex-1`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`${BTN_P} flex-1`}
                >
                  {saving && <Spinner className="text-white" />}
                  Submit for Approval
                </button>
              </div>
            </div>

            {/* Right: live preview */}
            <div className="w-72 shrink-0">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-3 uppercase tracking-wide">
                Live Preview
              </p>
              <div className="sticky top-0 bg-[#e5ddd5] dark:bg-[#0b1413] rounded-2xl p-4 min-h-[300px]">
                {/* Image header preview */}
                {metaHeaderType === "image" && metaHeaderImageUrl && (
                  <img
                    src={toDirectImageUrl(metaHeaderImageUrl)}
                    alt="Header"
                    className="w-full h-36 object-cover rounded-xl mb-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                {metaHeaderType === "image" && !metaHeaderImageUrl && (
                  <div className="w-full h-36 rounded-xl mb-3 bg-gray-300/50 dark:bg-gray-700/50 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400 dark:text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M13.5 12h.008v.008H13.5V12z"
                      />
                    </svg>
                  </div>
                )}
                {/* Bubble */}
                <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-sm p-3 space-y-1.5 shadow-lg">
                  {metaHeaderType === "text" && metaForm.header && (
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {metaForm.header}
                    </p>
                  )}
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                    {metaForm.body ? (
                      metaVarSamples.reduce(
                        (t, s, i) =>
                          t.replace(
                            new RegExp(`\\{\\{${i + 1}\\}\\}`, "g"),
                            s || `{{${i + 1}}}`,
                          ),
                        metaForm.body,
                      )
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500 italic">
                        Start typing your body text…
                      </span>
                    )}
                  </p>
                  {metaForm.footer && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {metaForm.footer}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 text-right">
                    12:00 PM ✓✓
                  </p>
                </div>
                {/* Buttons preview */}
                {metaButtons.filter((b) => b.text).length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {metaButtons
                      .filter((b) => b.text)
                      .map((b, i) => (
                        <div
                          key={i}
                          className="bg-white dark:bg-[#1f2c34] rounded-xl py-2 px-3 flex items-center justify-center gap-1.5"
                        >
                          {b.type === "URL" && (
                            <svg
                              className="w-3 h-3 text-indigo-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.828 14.828a4 4 0 015.656 0l4-4a4 4 0 01-5.656-5.656l-1.102 1.101"
                              />
                            </svg>
                          )}
                          {b.type === "PHONE_NUMBER" && (
                            <svg
                              className="w-3 h-3 text-indigo-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                              />
                            </svg>
                          )}
                          <span className="text-xs text-indigo-600 dark:text-[#53bdeb] font-medium">
                            {b.text}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              {/* Category badge */}
              {metaForm.category && (
                <div className="mt-3">
                  <CategoryBadge category={metaForm.category} />
                </div>
              )}
            </div>
          </form>
        ) : (
          /* ── QR Template Form ── */
          <form onSubmit={handleSaveQR} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Template Name *
              </label>
              <input
                required
                value={qrForm.name}
                onChange={(e) => setQrForm({ ...qrForm, name: e.target.value })}
                placeholder="e.g. Diwali Greeting"
                className={INPUT}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Message Body *
                </label>
                <VarDropdown
                  onSelect={(varStr) => {
                    const textarea = qrBodyRef.current;
                    if (textarea) {
                      const s = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const newBody =
                        qrForm.body.slice(0, s) + varStr + qrForm.body.slice(end);
                      setQrForm((f) => ({ ...f, body: newBody }));
                      requestAnimationFrame(() => {
                        textarea.selectionStart = s + varStr.length;
                        textarea.selectionEnd = s + varStr.length;
                        textarea.focus();
                      });
                    } else {
                      setQrForm((f) => ({ ...f, body: f.body + varStr }));
                    }
                  }}
                />
              </div>
              <textarea
                ref={qrBodyRef}
                required
                value={qrForm.body}
                onChange={(e) => setQrForm({ ...qrForm, body: e.target.value })}
                rows={6}
                placeholder={"Hi {{name}},\n\nWe have a special offer for you!"}
                className={`${INPUT} resize-none font-mono text-xs`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                Tags{" "}
                <span className="font-normal text-gray-400">· Optional</span>
              </label>
              <input
                value={qrForm.tags}
                onChange={(e) => setQrForm({ ...qrForm, tags: e.target.value })}
                placeholder="e.g. promotional, festival, reminder"
                className={INPUT}
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated tags to organise your templates.
              </p>
            </div>
            {qrForm.body && (
              <div className="rounded-xl p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2">
                  Live Preview
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {prev(qrForm.body)}
                </p>
              </div>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${BTN_G} flex-1`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`${BTN_P} flex-1`}
              >
                {saving && <Spinner className="text-white" />}
                {editing ? "Save Changes" : "Create"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Meta Edit Modal (name + body + tags) ── */}
      <Modal
        open={metaEditOpen}
        onClose={() => setMetaEditOpen(false)}
        title="Edit Template"
      >
        <form onSubmit={handleSaveMetaEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Display Name *
            </label>
            <input
              required
              value={metaEditForm.name}
              onChange={(e) =>
                setMetaEditForm({ ...metaEditForm, name: e.target.value })
              }
              placeholder="e.g. Order Confirmation"
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Body text
            </label>
            <textarea
              value={metaEditForm.body}
              onChange={(e) => {
                const body = e.target.value;
                setMetaEditForm({ ...metaEditForm, body });
                // Keep varMap keys in sync with numbered vars in body
                const nums = [...(body.match(/\{\{(\d+)\}\}/g) || [])].map((m) => m.replace(/\{|\}/g, ""));
                setMetaEditVarMap((prev) => {
                  const next: Record<string, string> = {};
                  for (const n of nums) next[n] = prev[n] ?? "";
                  return next;
                });
              }}
              rows={5}
              className={`${INPUT} resize-none font-mono text-xs`}
            />
            <p className="text-xs text-gray-400 mt-1">
              Saved locally only — does not re-submit to Meta.
            </p>
          </div>

          {/* Variable Mapping — shown when body has {{1}}, {{2}}, … */}
          {(() => {
            const nums = Object.keys(metaEditVarMap).sort((a, b) => parseInt(a) - parseInt(b));
            if (nums.length === 0) return null;
            const FIELD_OPTIONS = META_FIELD_OPTIONS;
            return (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/10 p-3 space-y-2.5">
                <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  Variable Mapping
                  <span className="font-normal text-indigo-500 ml-1">· Map each variable to a lead field</span>
                </p>
                {nums.map((n) => (
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 w-10 shrink-0">{`{{${n}}}`}</span>
                    <span className="text-xs text-gray-400">→</span>
                    <select
                      value={metaEditVarMap[n] ?? ""}
                      onChange={(e) =>
                        setMetaEditVarMap((prev) => ({ ...prev, [n]: e.target.value }))
                      }
                      className={`${INPUT} py-1.5 text-xs flex-1`}
                    >
                      {FIELD_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            );
          })()}

          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Tags <span className="font-normal text-gray-400">· Optional</span>
            </label>
            <input
              value={metaEditForm.tags}
              onChange={(e) =>
                setMetaEditForm({ ...metaEditForm, tags: e.target.value })
              }
              placeholder="e.g. orders, promotions, alerts"
              className={INPUT}
            />
            <p className="text-xs text-gray-400 mt-1">
              Comma-separated. Personal organisation only.
            </p>
          </div>
          {metaEditTemplate && (
            <div className="rounded-xl p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-400 font-mono">
                {metaEditTemplate.meta_template_name}
              </p>
              <CategoryBadge category={metaEditTemplate.meta_category} />
              <StatusBadge status={metaEditTemplate.meta_status} />
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setMetaEditOpen(false)}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={metaEditSaving}
              className={`${BTN_P} flex-1`}
            >
              {metaEditSaving && <Spinner className="text-white" />}
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Quick Tags Modal ── */}
      <Modal
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        title="Edit Tags"
      >
        <form onSubmit={handleSaveTags} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Tags for{" "}
              <span className="text-gray-700 dark:text-gray-300">
                {tagsTemplate?.name}
              </span>
            </label>
            <input
              value={tagsValue}
              onChange={(e) => setTagsValue(e.target.value)}
              placeholder="e.g. promotional, festival, reminder"
              className={INPUT}
              autoFocus
            />
            <p className="text-xs text-gray-400 mt-1">
              Comma-separated. Used for personal organisation only.
            </p>
          </div>
          {/* Existing tags as clickable suggestions */}
          {(() => {
            const currentTags = new Set(
              tagsValue
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            );
            const suggestions = allTags.filter((t) => !currentTags.has(t));
            if (suggestions.length === 0) return null;
            return (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  Existing Tags
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {suggestions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setTagsValue((prev) =>
                          prev.trim() ? `${prev.trim()}, ${tag}` : tag,
                        )
                      }
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors"
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
              {tagsValue
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
                .map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 font-medium"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setTagsOpen(false)}
              className={`${BTN_G} flex-1`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={tagsSaving}
              className={`${BTN_P} flex-1`}
            >
              {tagsSaving && <Spinner className="text-white" />}
              Save Tags
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Tag Management Modal ── */}
      <Modal
        open={tagMgmtOpen}
        onClose={() => setTagMgmtOpen(false)}
        wide
        title="Manage Tags"
      >
        <div className="flex gap-5 min-h-[50vh]">
          {/* Left: tag list */}
          <div className="w-48 shrink-0 border-r border-gray-100 dark:border-gray-800 pr-4 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              All Tags
            </p>
            {allTags.length === 0 && (
              <p className="text-xs text-gray-400">
                No tags yet. Add tags to templates using the Tags button.
              </p>
            )}
            {allTags.map((tag) => {
              const count = visibleTemplates.filter((t) =>
                (t.tags ?? "")
                  .split(",")
                  .map((s) => s.trim())
                  .includes(tag),
              ).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${selectedTag === tag ? "bg-indigo-600 text-white" : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400"}`}
                >
                  <span className="truncate">{tag}</span>
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold ${selectedTag === tag ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          {/* Right: templates under selected tag */}
          <div className="flex-1 min-w-0">
            {selectedTag ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Templates tagged
                  </span>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2.5 py-0.5 rounded-full">
                    {selectedTag}
                  </span>
                </div>
                <div className="space-y-2">
                  {visibleTemplates
                    .filter((t) =>
                      (t.tags ?? "")
                        .split(",")
                        .map((s) => s.trim())
                        .includes(selectedTag),
                    )
                    .map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {t.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {t.meta_template_name ?? t.body.slice(0, 60)}
                          </p>
                          {/* All tags for this template */}
                          <div className="flex gap-1 flex-wrap mt-1">
                            {(t.tags ?? "")
                              .split(",")
                              .map((tag) => tag.trim())
                              .filter(Boolean)
                              .map((tag) => (
                                <span
                                  key={tag}
                                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tag === selectedTag ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                        </div>
                        <button
                          title={`Remove "${selectedTag}" from this template`}
                          onClick={async () => {
                            const newTags = (t.tags ?? "")
                              .split(",")
                              .map((s) => s.trim())
                              .filter((s) => s && s !== selectedTag)
                              .join(", ");
                            await apiPut(`/templates/${t.id}`, {
                              tags: newTags || null,
                            });
                            load();
                          }}
                          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 transition-all"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  {visibleTemplates.filter((t) =>
                    (t.tags ?? "")
                      .split(",")
                      .map((s) => s.trim())
                      .includes(selectedTag),
                  ).length === 0 && (
                    <p className="text-sm text-gray-400 py-8 text-center">
                      No templates with this tag.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">
                Select a tag from the left to see templates.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
