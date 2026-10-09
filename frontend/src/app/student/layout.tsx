import { AppShell } from "@/components/AppShell";

const nav = [
  { href: "/student/upcoming", label: "Upcoming Exams" },
  { href: "/student/past", label: "Past Exams" },
  { href: "/student/profile", label: "Profile" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="student" nav={nav}>
      {children}
    </AppShell>
  );
}
