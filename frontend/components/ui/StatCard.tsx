import Spinner from "./Spinner";

interface StatCardProps {
  title: string;
  value?: number | string;
  icon?: React.ReactNode;
  subtitle?: string;
  loading?: boolean;
  gradient?: string;
}

export default function StatCard({ title, value, icon, subtitle, loading, gradient = "grad-1" }: StatCardProps) {
  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 overflow-hidden group hover:shadow-xl hover:shadow-gray-200/60 dark:hover:shadow-gray-950/80 hover:-translate-y-1 transition-all duration-300">
      {/* Subtle bg blob decoration */}
      <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-[0.07] blur-md ${gradient}`} />

      {/* Icon */}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg mb-5 ${gradient}`}>
        {icon}
      </div>

      {/* Value */}
      {loading ? (
        <div className="h-12 flex items-center">
          <Spinner />
        </div>
      ) : (
        <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
          {value ?? 0}
        </p>
      )}

      {/* Labels */}
      <div className="mt-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
