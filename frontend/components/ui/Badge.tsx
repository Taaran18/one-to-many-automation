const styles: Record<string, string> = {
  draft:     "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
  scheduled: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  running:   "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  failed:    "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  prospect:  "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  customer:  "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
  sent:      "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  delivered: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
};

const dots: Record<string, string> = {
  draft: "bg-gray-400", scheduled: "bg-blue-500", running: "bg-amber-500",
  completed: "bg-emerald-500", failed: "bg-red-500", prospect: "bg-purple-500",
  customer: "bg-emerald-500", sent: "bg-blue-500", delivered: "bg-emerald-500",
};

export default function Badge({ label }: { label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${styles[label] ?? styles.draft}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dots[label] ?? "bg-gray-400"}`} />
      {label}
    </span>
  );
}
