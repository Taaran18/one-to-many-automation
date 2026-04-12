"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { apiGet, apiPost } from "@/lib/api";
import type { Campaign, MessageLog } from "@/lib/types";
import Link from "next/link";

const fmt = (d?: string) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [logs, setLogs] = useState<MessageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [c, l] = await Promise.all([
        apiGet<Campaign>(`/campaigns/${id}`),
        apiGet<MessageLog[]>(`/campaigns/${id}/logs`),
      ]);
      setCampaign(c);
      setLogs(l);
    } catch {
      router.push("/campaigns");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id]);

  const handleStart = async () => {
    setStarting(true);
    try {
      await apiPost(`/campaigns/${id}/start`);
      load();
    } catch (err: any) {
      setStartError(err.message);
    } finally {
      setStarting(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  if (!campaign) return null;

  const total = (campaign.messages_sent ?? 0) + (campaign.messages_failed ?? 0);
  const rate =
    total > 0
      ? Math.round(((campaign.messages_sent ?? 0) / total) * 100)
      : null;

  return (
    <div className="space-y-6">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to Campaigns
      </Link>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {campaign.name}
              </h1>
              <Badge label={campaign.status} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {[
                campaign.template_name && {
                  label: "Template",
                  value: campaign.template_name,
                },
                campaign.lead_group_name && {
                  label: "Group",
                  value: campaign.lead_group_name,
                },
                campaign.scheduled_at && {
                  label: "Scheduled",
                  value: fmt(campaign.scheduled_at),
                },
                campaign.created_at && {
                  label: "Created",
                  value: fmt(campaign.created_at),
                },
              ]
                .filter(Boolean)
                .map((item: any) => (
                  <span
                    key={item.label}
                    className="text-xs text-gray-400 dark:text-gray-500"
                  >
                    {item.label}:{" "}
                    <span className="font-semibold text-gray-600 dark:text-gray-300">
                      {item.value}
                    </span>
                  </span>
                ))}
            </div>
          </div>
          {(campaign.status === "draft" || campaign.status === "scheduled") && (
            <button
              onClick={handleStart}
              disabled={starting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/25"
            >
              {starting ? (
                <Spinner className="text-white" />
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
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              Start Campaign
            </button>
          )}
        </div>
        {startError && (
          <p className="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
            {startError}
          </p>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
          {[
            {
              label: "Sent",
              value: campaign.messages_sent ?? 0,
              color: "text-gray-900 dark:text-white",
            },
            {
              label: "Failed",
              value: campaign.messages_failed ?? 0,
              color: "text-red-500",
            },
            {
              label: "Success Rate",
              value: rate !== null ? `${rate}%` : "—",
              color: "text-indigo-600 dark:text-indigo-400",
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Logs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">
            Message Logs
          </h2>
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
            {logs.length}
          </span>
        </div>
        {logs.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-12">
            No messages sent yet
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                {["Run", "Lead", campaign?.channel === "email" ? "Email" : "Phone", "Status", "Sent At", "Error"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {[...logs]
                .sort(
                  (a, b) =>
                    (b.run_number ?? 1) - (a.run_number ?? 1) || b.id - a.id,
                )
                .map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                        #{log.run_number ?? 1}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">
                      {log.lead_name || `#${log.lead_id}`}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400">
                      {campaign?.channel === "email"
                        ? (log.lead_email || "—")
                        : (log.lead_phone || "—")}
                    </td>
                    <td className="px-5 py-4">
                      <Badge label={log.status} />
                    </td>
                    <td
                      suppressHydrationWarning
                      className="px-5 py-4 text-xs text-gray-400 dark:text-gray-500"
                    >
                      {fmt(log.sent_at)}
                    </td>
                    <td className="px-5 py-4 text-xs text-red-500 dark:text-red-400">
                      {log.error_message || "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
