"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { IntegrityReportSummary, RiskLevel } from "@exam/shared";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { RiskChip } from "@/components/RiskChip";
import { fetchReports } from "@/lib/api";
import { assuranceLabel, reviewLabel } from "@/lib/assurance-labels";
import { getExam } from "@/lib/exam-store";

const RISK_BORDER: Record<RiskLevel, string> = {
  low: "border-l-emerald-500",
  medium: "border-l-amber-500",
  high: "border-l-red-500",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<IntegrityReportSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = () => void fetchReports().then((rows) => {
      setReports(rows ?? []);
      setLoaded(true);
    });
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  const counts = {
    low: reports.filter((r) => r.risk === "low").length,
    medium: reports.filter((r) => r.risk === "medium").length,
    high: reports.filter((r) => r.risk === "high").length,
  };

  return (
    <>
      <PageHeader
        title="Reports"
        description="Deterministic integrity summaries for human review—not automatic misconduct decisions."
      />
      {loaded && reports.length === 0 ? (
        <EmptyState>
          No sessions yet. When a student starts an exam with the API running, a report appears here.
        </EmptyState>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <StatCard label="Low" value={counts.low} tone="low" />
            <StatCard label="Medium" value={counts.medium} tone="medium" />
            <StatCard label="High" value={counts.high} tone="high" />
          </div>
          <ul className="space-y-4">
            {reports.map((report) => {
              const examTitle = getExam(report.examId)?.title ?? report.examId;
              return (
                <li
                  key={report.sessionId}
                  className={`rounded-xl border border-[var(--border)] border-l-4 bg-[var(--surface)] p-5 shadow-sm ${RISK_BORDER[report.risk]}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {report.displayName}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{examTitle}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {assuranceLabel(report.assurance)} · Updated{" "}
                        {new Date(report.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <RiskChip level={report.risk} />
                      <span className="rounded-full bg-[var(--exam-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--cyan)]">
                        {reviewLabel(report.reviewStatus)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 text-base leading-relaxed text-[var(--foreground)]">
                    {report.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                    <Link
                      href={`/admin/reports/${encodeURIComponent(report.sessionId)}`}
                      className="text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      Open integrity report
                    </Link>
                    <Link
                      href={`/admin/live/${encodeURIComponent(report.sessionId)}`}
                      className="text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      Review timeline
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: RiskLevel;
}) {
  const bg =
    tone === "low"
      ? "bg-[var(--risk-low-bg)]"
      : tone === "medium"
        ? "bg-[var(--risk-medium-bg)]"
        : "bg-[var(--risk-high-bg)]";
  return (
    <div className={`rounded-xl border border-[var(--border)] px-4 py-3 ${bg}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
