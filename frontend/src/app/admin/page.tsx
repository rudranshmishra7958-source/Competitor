"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RiskChip } from "@/components/RiskChip";
import { fetchLiveBoard } from "@/lib/api";
import type { LiveSessionRow, RiskLevel } from "@exam/shared";

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<LiveSessionRow[]>([]);

  useEffect(() => {
    void fetchLiveBoard().then((result) => setRows(result ?? []));
  }, []);

  const counts: { level: RiskLevel; count: number }[] = (
    ["low", "medium", "high"] as RiskLevel[]
  ).map((level) => ({
    level,
    count: rows.filter((row) => row.risk === level).length,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Server-backed integrity overview. Open Live Monitoring to review evidence."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {counts.map((item) => (
          <div
            key={item.level}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <RiskChip level={item.level} />
            <p className="mt-3 text-3xl font-semibold">{item.count}</p>
            <p className="text-sm text-[var(--muted)]">Exam sessions</p>
          </div>
        ))}
      </div>
      <Link
        href="/admin/live"
        className="mt-6 inline-block text-sm text-[var(--accent)] underline"
      >
        Open live monitoring
      </Link>
    </>
  );
}
