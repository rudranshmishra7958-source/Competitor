import { AppShell } from "@/components/AppShell";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/exams", label: "Exams" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/live", label: "Live Monitoring" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/security", label: "Security" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="admin" nav={nav}>
      {children}
    </AppShell>
  );
}
