import Sidebar from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="px-10 py-10 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
