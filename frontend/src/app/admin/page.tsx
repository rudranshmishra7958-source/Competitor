"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Radar, FilePlus2, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { fetchLiveBoard } from "@/lib/api";
import { CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import type { LiveSessionRow, RiskLevel } from "@exam/shared";

const meta: Record<RiskLevel, { label: string; icon: React.ReactNode }> = {
  low: { label: "Low risk", icon: <CircleCheck className="size-5" aria-hidden /> },
  medium: { label: "Medium risk", icon: <TriangleAlert className="size-5" aria-hidden /> },
  high: { label: "High risk", icon: <OctagonAlert className="size-5" aria-hidden /> },
};

const actions = [
  { href: "/admin/live", label: "Live monitoring", hint: "Watch sessions in real time", Icon: Radar },
  { href: "/admin/exams/new", label: "Create exam", hint: "Schedule a new assessment", Icon: FilePlus2 },
  { href: "/admin/reports", label: "Reports", hint: "Review and export evidence", Icon: BarChart3 },
];

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<LiveSessionRow[]>([]);

  useEffect(() => {
    void fetchLiveBoard().then((result) => setRows(result ?? []));
  }, []);

  const levels: RiskLevel[] = ["low", "medium", "high"];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Server-backed integrity overview. Open Live Monitoring to review evidence."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {levels.map((level) => (
          <StatCard
            key={level}
            tone={level}
            icon={meta[level].icon}
            label={meta[level].label}
            value={rows.filter((row) => row.risk === level).length}
            hint="Exam sessions"
          />
        ))}
      </div>
      <h2 className="mb-3 mt-10 text-sm font-medium text-muted-foreground">
        Quick actions
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {actions.map(({ href, label, hint, Icon }) => (
          <Card key={href} interactive className="p-0">
            <ButtonLink
              href={href}
              variant="ghost"
              className="!flex h-full min-h-24 w-full !justify-start gap-3 rounded-2xl px-5 py-4 text-left"
            >
              <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-xs font-normal text-[var(--muted)]">{hint}</span>
              </span>
              <ArrowRight className="size-4 text-[var(--muted)]" aria-hidden />
            </ButtonLink>
          </Card>
        ))}
      </div>
    </>
  );
}
