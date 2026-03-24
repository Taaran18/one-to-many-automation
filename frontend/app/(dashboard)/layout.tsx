import MobileLayout from "@/components/layout/MobileLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MobileLayout>{children}</MobileLayout>;
}
