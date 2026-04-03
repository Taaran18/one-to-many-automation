import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chats | OneToMany",
  description: "WhatsApp-like inbox to message your leads and see replies from campaigns.",
};

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Render children directly — the chats page manages its own full-height layout
  // and doesn't want the padding wrapper from MobileLayout's <main>.
  return <>{children}</>;
}
