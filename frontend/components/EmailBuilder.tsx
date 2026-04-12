"use client";

import { useState, useEffect, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Block {
  id: string;
  type: "heading" | "text" | "image" | "button" | "divider" | "spacer";
  // heading
  headingText?: string;
  headingLevel?: "h1" | "h2" | "h3";
  headingColor?: string;
  headingAlign?: "left" | "center" | "right";
  // text
  textContent?: string;
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  textSize?: number;
  // image
  imageUrl?: string;
  imageAlt?: string;
  imageLink?: string;
  imageWidth?: string;
  imageAlign?: "left" | "center" | "right";
  // button
  buttonText?: string;
  buttonLink?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonAlign?: "left" | "center" | "right";
  buttonRadius?: number;
  // divider
  dividerColor?: string;
  dividerThickness?: number;
  // spacer
  spacerHeight?: number;
}

// ── HTML / text generation ─────────────────────────────────────────────────────

export const BUILDER_MARKER = "<!--EMAILBUILDER:";

function blockToHtml(b: Block): string {
  switch (b.type) {
    case "heading": {
      const tag = b.headingLevel || "h2";
      const sizes: Record<string, string> = { h1: "28", h2: "22", h3: "18" };
      return `<tr><td align="${b.headingAlign || "center"}" style="padding:20px 40px;"><${tag} style="color:${b.headingColor || "#111111"};margin:0;font-size:${sizes[tag]}px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;line-height:1.3;">${b.headingText || ""}</${tag}></td></tr>`;
    }
    case "text": {
      const content = (b.textContent || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
      return `<tr><td align="${b.textAlign || "left"}" style="padding:10px 40px;"><p style="color:${b.textColor || "#333333"};margin:0;line-height:1.7;font-size:${b.textSize || 15}px;font-family:Arial,Helvetica,sans-serif;">${content}</p></td></tr>`;
    }
    case "image": {
      const img = `<img src="${b.imageUrl || ""}" alt="${b.imageAlt || ""}" width="${b.imageWidth || "100%"}" style="display:block;border:0;max-width:100%;" />`;
      const inner = b.imageLink ? `<a href="${b.imageLink}" style="text-decoration:none;">${img}</a>` : img;
      return `<tr><td align="${b.imageAlign || "center"}" style="padding:10px 40px;">${inner}</td></tr>`;
    }
    case "button": {
      return `<tr><td align="${b.buttonAlign || "center"}" style="padding:20px 40px;"><a href="${b.buttonLink || "#"}" style="display:inline-block;background:${b.buttonBgColor || "#6366f1"};color:${b.buttonTextColor || "#ffffff"};padding:14px 36px;border-radius:${b.buttonRadius ?? 6}px;text-decoration:none;font-weight:bold;font-size:15px;font-family:Arial,Helvetica,sans-serif;">${b.buttonText || "Click Here"}</a></td></tr>`;
    }
    case "divider": {
      return `<tr><td style="padding:10px 40px;"><hr style="border:none;border-top:${b.dividerThickness || 1}px solid ${b.dividerColor || "#e5e7eb"};margin:0;" /></td></tr>`;
    }
    case "spacer": {
      const h = b.spacerHeight || 24;
      return `<tr><td style="height:${h}px;line-height:${h}px;font-size:${h}px;">&nbsp;</td></tr>`;
    }
    default: return "";
  }
}

export function generateEmailHtml(blocks: Block[], bgColor: string, containerBg: string): string {
  const rows = blocks.map(blockToHtml).join("\n");
  const state = JSON.stringify({ blocks, bgColor, containerBg });
  return `${BUILDER_MARKER}${state}-->
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${bgColor};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${bgColor};">
<tr><td align="center" style="padding:30px 0;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:${containerBg};border-radius:8px;overflow:hidden;max-width:100%;">
${rows}
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function generatePlainText(blocks: Block[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case "heading": return b.headingText || "";
      case "text":    return b.textContent || "";
      case "button":  return `${b.buttonText || "Click Here"}: ${b.buttonLink || ""}`;
      case "image":   return b.imageAlt ? `[Image: ${b.imageAlt}]` : "[Image]";
      default:        return "";
    }
  }).filter(Boolean).join("\n\n");
}

export function parseBuilderState(html: string): { blocks: Block[]; bgColor: string; containerBg: string } | null {
  if (!html) return null;
  const match = html.match(/<!--EMAILBUILDER:([\s\S]*?)-->/);
  if (!match) return null;
  try {
    const d = JSON.parse(match[1]);
    return d?.blocks ? d : null;
  } catch { return null; }
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

export function makeBlock(type: Block["type"]): Block {
  switch (type) {
    case "heading": return { id: uid(), type, headingText: "", headingLevel: "h2", headingColor: "#111111", headingAlign: "center" };
    case "text":    return { id: uid(), type, textContent: "", textColor: "#333333", textAlign: "left", textSize: 15 };
    case "image":   return { id: uid(), type, imageUrl: "", imageAlt: "", imageLink: "", imageWidth: "100%", imageAlign: "center" };
    case "button":  return { id: uid(), type, buttonText: "Click Here", buttonLink: "", buttonBgColor: "#6366f1", buttonTextColor: "#ffffff", buttonAlign: "center", buttonRadius: 6 };
    case "divider": return { id: uid(), type, dividerColor: "#e5e7eb", dividerThickness: 1 };
    case "spacer":  return { id: uid(), type, spacerHeight: 24 };
  }
}

const VARS = ["{{name}}", "{{email}}", "{{phone}}", "{{company_name}}", "{{city}}", "{{state}}", "{{country}}"];

const BLOCK_META: Record<Block["type"], { label: string; badge: string }> = {
  heading: { label: "Heading",  badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" },
  text:    { label: "Text",     badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" },
  image:   { label: "Image",    badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" },
  button:  { label: "Button",   badge: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" },
  divider: { label: "Divider",  badge: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
  spacer:  { label: "Spacer",   badge: "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400" },
};

const F = "w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all";

// ── Sub-components ─────────────────────────────────────────────────────────────

function VarBtn({ onInsert }: { onInsert: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 transition-all">
        + var
      </button>
      {open && (
        <div className="absolute z-50 left-0 mt-1 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
          {VARS.map(v => (
            <button key={v} type="button" onClick={() => { onInsert(v); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-200 transition-colors">
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AlignRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-0.5 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-fit">
      {(["left", "center", "right"] as const).map(a => (
        <button key={a} type="button" onClick={() => onChange(a)}
          className={`px-2.5 py-1 text-[10px] font-bold transition-all ${value === a ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
          {a === "left" ? "Left" : a === "center" ? "Center" : "Right"}
        </button>
      ))}
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-20 shrink-0">{label}</span>
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        className="w-7 h-7 rounded cursor-pointer border border-gray-200 dark:border-gray-700 shrink-0 p-0.5 bg-white dark:bg-gray-800" />
      <input value={value} onChange={e => onChange(e.target.value)} className={`${F} flex-1`} placeholder="#000000" />
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}

function blockPreview(b: Block): string {
  switch (b.type) {
    case "heading": return b.headingText || "(empty)";
    case "text":    return (b.textContent || "(empty)").slice(0, 45);
    case "image":   return b.imageUrl ? b.imageUrl.slice(0, 38) + "…" : "(no image URL)";
    case "button":  return b.buttonText ? `"${b.buttonText}" → ${b.buttonLink || "#"}` : "(empty)";
    case "divider": return `${b.dividerThickness || 1}px · ${b.dividerColor || "#e5e7eb"}`;
    case "spacer":  return `${b.spacerHeight || 24}px gap`;
  }
}

// ── Block editor (type-specific fields) ───────────────────────────────────────

function BlockEditor({ block, onUpdate }: { block: Block; onUpdate: (p: Partial<Block>) => void }) {
  const appnd = (cur: string | undefined, v: string) => (cur || "") + v;

  if (block.type === "heading") return (
    <div className="space-y-2.5">
      <FieldRow label="Text">
        <div className="flex gap-1.5 items-start">
          <textarea rows={2} value={block.headingText || ""} onChange={e => onUpdate({ headingText: e.target.value })}
            placeholder="Your headline here…" className={`${F} resize-none flex-1`} />
          <VarBtn onInsert={v => onUpdate({ headingText: appnd(block.headingText, v) })} />
        </div>
      </FieldRow>
      <FieldRow label="Level">
        <div className="flex gap-1 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 w-fit">
          {(["h1", "h2", "h3"] as const).map(l => (
            <button key={l} type="button" onClick={() => onUpdate({ headingLevel: l })}
              className={`px-3 py-1 text-xs font-bold transition-all ${block.headingLevel === l ? "bg-indigo-600 text-white" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Align"><AlignRow value={block.headingAlign || "center"} onChange={v => onUpdate({ headingAlign: v as "left" | "center" | "right" })} /></FieldRow>
      <ColorRow label="Color" value={block.headingColor || "#111111"} onChange={v => onUpdate({ headingColor: v })} />
    </div>
  );

  if (block.type === "text") return (
    <div className="space-y-2.5">
      <FieldRow label="Content">
        <div className="flex gap-1.5 items-start">
          <textarea rows={4} value={block.textContent || ""} onChange={e => onUpdate({ textContent: e.target.value })}
            placeholder="Your message here…" className={`${F} resize-none flex-1`} />
          <VarBtn onInsert={v => onUpdate({ textContent: appnd(block.textContent, v) })} />
        </div>
      </FieldRow>
      <div className="flex gap-4 flex-wrap">
        <FieldRow label="Align"><AlignRow value={block.textAlign || "left"} onChange={v => onUpdate({ textAlign: v as "left" | "center" | "right" })} /></FieldRow>
        <FieldRow label="Font size">
          <div className="flex items-center gap-1.5">
            <input type="number" min={10} max={48} value={block.textSize || 15} onChange={e => onUpdate({ textSize: Number(e.target.value) })} className={`${F} w-16`} />
            <span className="text-xs text-gray-400">px</span>
          </div>
        </FieldRow>
      </div>
      <ColorRow label="Color" value={block.textColor || "#333333"} onChange={v => onUpdate({ textColor: v })} />
    </div>
  );

  if (block.type === "image") return (
    <div className="space-y-2.5">
      <FieldRow label="Image URL">
        <input value={block.imageUrl || ""} onChange={e => onUpdate({ imageUrl: e.target.value })}
          placeholder="https://example.com/image.jpg" className={F} />
      </FieldRow>
      <FieldRow label="Link URL (optional)">
        <input value={block.imageLink || ""} onChange={e => onUpdate({ imageLink: e.target.value })}
          placeholder="https://example.com" className={F} />
      </FieldRow>
      <FieldRow label="Alt text">
        <input value={block.imageAlt || ""} onChange={e => onUpdate({ imageAlt: e.target.value })}
          placeholder="Description of image" className={F} />
      </FieldRow>
      <div className="flex gap-4 flex-wrap">
        <FieldRow label="Width">
          <div className="flex gap-1">
            {["100%", "75%", "50%"].map(w => (
              <button key={w} type="button" onClick={() => onUpdate({ imageWidth: w })}
                className={`px-2 py-1 text-xs font-semibold rounded-lg border transition-all ${block.imageWidth === w ? "bg-indigo-600 text-white border-indigo-600" : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                {w}
              </button>
            ))}
            <input value={block.imageWidth || "100%"} onChange={e => onUpdate({ imageWidth: e.target.value })}
              className={`${F} w-20`} placeholder="600px" />
          </div>
        </FieldRow>
        <FieldRow label="Align"><AlignRow value={block.imageAlign || "center"} onChange={v => onUpdate({ imageAlign: v as "left" | "center" | "right" })} /></FieldRow>
      </div>
      {block.imageUrl && (
        <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <img src={block.imageUrl} alt={block.imageAlt || ""} className="max-h-32 object-contain mx-auto"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}
    </div>
  );

  if (block.type === "button") return (
    <div className="space-y-2.5">
      <FieldRow label="Button Text">
        <div className="flex gap-1.5 items-center">
          <input value={block.buttonText || ""} onChange={e => onUpdate({ buttonText: e.target.value })}
            placeholder="Click Here" className={`${F} flex-1`} />
          <VarBtn onInsert={v => onUpdate({ buttonText: appnd(block.buttonText, v) })} />
        </div>
      </FieldRow>
      <FieldRow label="Link URL">
        <input value={block.buttonLink || ""} onChange={e => onUpdate({ buttonLink: e.target.value })}
          placeholder="https://example.com" className={F} />
      </FieldRow>
      <FieldRow label="Align"><AlignRow value={block.buttonAlign || "center"} onChange={v => onUpdate({ buttonAlign: v as "left" | "center" | "right" })} /></FieldRow>
      <div className="flex gap-4 flex-wrap">
        <ColorRow label="Background" value={block.buttonBgColor || "#6366f1"} onChange={v => onUpdate({ buttonBgColor: v })} />
        <ColorRow label="Text color"  value={block.buttonTextColor || "#ffffff"} onChange={v => onUpdate({ buttonTextColor: v })} />
      </div>
      <FieldRow label="Border radius">
        <div className="flex items-center gap-1.5">
          <input type="range" min={0} max={50} value={block.buttonRadius ?? 6} onChange={e => onUpdate({ buttonRadius: Number(e.target.value) })} className="flex-1" />
          <span className="text-xs text-gray-500 w-8">{block.buttonRadius ?? 6}px</span>
        </div>
      </FieldRow>
      {/* Live button preview */}
      <div className="pt-1 flex justify-center">
        <span style={{ display: "inline-block", background: block.buttonBgColor || "#6366f1", color: block.buttonTextColor || "#ffffff", padding: "10px 28px", borderRadius: `${block.buttonRadius ?? 6}px`, fontSize: 13, fontWeight: 700 }}>
          {block.buttonText || "Click Here"}
        </span>
      </div>
    </div>
  );

  if (block.type === "divider") return (
    <div className="space-y-2.5">
      <ColorRow label="Color" value={block.dividerColor || "#e5e7eb"} onChange={v => onUpdate({ dividerColor: v })} />
      <FieldRow label="Thickness">
        <div className="flex items-center gap-2">
          <input type="range" min={1} max={8} value={block.dividerThickness || 1} onChange={e => onUpdate({ dividerThickness: Number(e.target.value) })} className="flex-1" />
          <span className="text-xs text-gray-500 w-8">{block.dividerThickness || 1}px</span>
        </div>
      </FieldRow>
    </div>
  );

  if (block.type === "spacer") return (
    <FieldRow label="Height">
      <div className="flex items-center gap-2">
        <input type="range" min={4} max={120} value={block.spacerHeight || 24} onChange={e => onUpdate({ spacerHeight: Number(e.target.value) })} className="flex-1" />
        <span className="text-xs text-gray-500 w-10">{block.spacerHeight || 24}px</span>
      </div>
    </FieldRow>
  );

  return null;
}

// ── Block row ─────────────────────────────────────────────────────────────────

function BlockRow({ block, expanded, isFirst, isLast, onToggle, onUpdate, onRemove, onMove }: {
  block: Block; expanded: boolean; isFirst: boolean; isLast: boolean;
  onToggle: () => void; onUpdate: (p: Partial<Block>) => void;
  onRemove: () => void; onMove: (dir: -1 | 1) => void;
}) {
  const m = BLOCK_META[block.type];
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 cursor-pointer select-none hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors" onClick={onToggle}>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${m.badge}`}>{m.label}</span>
        <span className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate">{blockPreview(block)}</span>
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          <button type="button" disabled={isFirst} onClick={() => onMove(-1)}
            className="w-6 h-6 flex items-center justify-center rounded text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">▲</button>
          <button type="button" disabled={isLast} onClick={() => onMove(1)}
            className="w-6 h-6 flex items-center justify-center rounded text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">▼</button>
          <button type="button" onClick={onRemove}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm font-bold">×</button>
        </div>
        <svg className={`w-3 h-3 text-gray-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {expanded && (
        <div className="px-3 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <BlockEditor block={block} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface EmailBuilderProps {
  blocks: Block[];
  bgColor: string;
  containerBg: string;
  onChange: (blocks: Block[], html: string, plainText: string) => void;
  onBgColorChange: (c: string) => void;
  onContainerBgChange: (c: string) => void;
}

export default function EmailBuilder({ blocks, bgColor, containerBg, onChange, onBgColorChange, onContainerBgChange }: EmailBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(blocks[0]?.id ?? null);
  const previewRef = useRef<HTMLIFrameElement>(null);

  // Helpers that mutate blocks and call onChange
  const emit = (next: Block[]) => onChange(next, generateEmailHtml(next, bgColor, containerBg), generatePlainText(next));

  const update = (id: string, patch: Partial<Block>) => emit(blocks.map(b => b.id === id ? { ...b, ...patch } : b));
  const addBlock = (type: Block["type"]) => {
    const nb = makeBlock(type);
    emit([...blocks, nb]);
    setExpandedId(nb.id);
  };
  const removeBlock = (id: string) => {
    const next = blocks.filter(b => b.id !== id);
    emit(next);
    if (expandedId === id) setExpandedId(next[next.length - 1]?.id ?? null);
  };
  const moveBlock = (id: string, dir: -1 | 1) => {
    const i = blocks.findIndex(b => b.id === id);
    if (i + dir < 0 || i + dir >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    emit(next);
  };

  // Emit when bg colors change (blocks unchanged)
  const handleBgChange = (c: string) => {
    onBgColorChange(c);
    onChange(blocks, generateEmailHtml(blocks, c, containerBg), generatePlainText(blocks));
  };
  const handleContainerBgChange = (c: string) => {
    onContainerBgChange(c);
    onChange(blocks, generateEmailHtml(blocks, bgColor, c), generatePlainText(blocks));
  };

  // Sync iframe preview
  useEffect(() => {
    const html = generateEmailHtml(blocks, bgColor, containerBg).replace(/<!--EMAILBUILDER:[\s\S]*?-->\n?/, "");
    try {
      const doc = previewRef.current?.contentDocument;
      if (doc) { doc.open(); doc.write(html); doc.close(); }
    } catch {}
  }, [blocks, bgColor, containerBg]);

  const BLOCK_TYPES: Block["type"][] = ["heading", "text", "image", "button", "divider", "spacer"];

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* ── Left: editor panel ─────────────────────────────────────────── */}
      <div className="w-[46%] flex flex-col gap-2.5 overflow-y-auto min-h-0 pr-1" style={{ scrollbarGutter: "stable" }}>

        {/* Email settings */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">Email Canvas</p>
          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">Page background</p>
              <div className="flex gap-1.5 items-center">
                <input type="color" value={bgColor} onChange={e => handleBgChange(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border border-gray-200 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800" />
                <input value={bgColor} onChange={e => handleBgChange(e.target.value)} className={`${F} flex-1`} />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">Card background</p>
              <div className="flex gap-1.5 items-center">
                <input type="color" value={containerBg} onChange={e => handleContainerBgChange(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border border-gray-200 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800" />
                <input value={containerBg} onChange={e => handleContainerBgChange(e.target.value)} className={`${F} flex-1`} />
              </div>
            </div>
          </div>
        </div>

        {/* Block list */}
        {blocks.length === 0 && (
          <div className="text-center py-10 text-xs text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl shrink-0">
            Add blocks below to build your email
          </div>
        )}
        {blocks.map((b, i) => (
          <BlockRow key={b.id} block={b} expanded={expandedId === b.id}
            isFirst={i === 0} isLast={i === blocks.length - 1}
            onToggle={() => setExpandedId(expandedId === b.id ? null : b.id)}
            onUpdate={patch => update(b.id, patch)}
            onRemove={() => removeBlock(b.id)}
            onMove={dir => moveBlock(b.id, dir)}
          />
        ))}

        {/* Add block toolbar */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 p-3 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Add Block</p>
          <div className="flex flex-wrap gap-1.5">
            {BLOCK_TYPES.map(type => (
              <button key={type} type="button" onClick={() => addBlock(type)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all">
                <span className="text-[10px] opacity-50">+</span>
                {BLOCK_META[type].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: live preview ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-hidden">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">Live Preview</p>
        <div className="flex-1 min-h-0 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-100 dark:bg-gray-800">
          <iframe ref={previewRef} title="Email preview"
            className="w-full h-full border-0"
            sandbox="allow-same-origin" />
        </div>
      </div>
    </div>
  );
}
