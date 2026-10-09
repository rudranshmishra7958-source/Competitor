"use client";

import { ArrowRight, CircleCheck, OctagonAlert, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { IntegrityReportSummary, RiskLevel } from "@exam/shared";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { RiskChip } from "@/components/RiskChip";
import { PriorityBadge } from "@/components/proctor/ReviewEvidence";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, StatCard } from "@/components/ui/Card";
import { fetchReports } from "@/lib/api";
import { assuranceLabel, reviewLabel } from "@/lib/assurance-labels";
import { getExam } from "@/lib/exam-store";

const RISK_BORDER: Record<RiskLevel, string> = {
  low: "!border-l-[var(--risk-low-fg)]",
  medium: "!border-l-[var(--risk-medium-fg)]",
  high: "!border-l-[var(--risk-high-fg)]",
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
            <StatCard label="Low risk" value={counts.low} tone="low" icon={<CircleCheck className="size-5" aria-hidden />} />
            <StatCard label="Medium risk" value={counts.medium} tone="medium" icon={<TriangleAlert className="size-5" aria-hidden />} />
            <StatCard label="High risk" value={counts.high} tone="high" icon={<OctagonAlert className="size-5" aria-hidden />} />
          </div>
          <ul className="space-y-4">
            {[...reports]
              .sort((a, b) => (b.priority?.score ?? 0) - (a.priority?.score ?? 0))
              .map((report) => {
              const examTitle = getExam(report.examId)?.title ?? report.examId;
              return (
                <Card
                  as="li"
                  key={report.sessionId}
                  interactive
                  className={`border-l-4 ${RISK_BORDER[report.risk]}`}
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
                      <PriorityBadge priority={report.priority} />
                      <RiskChip level={report.risk} />
                      <Badge tone="accent">{reviewLabel(report.reviewStatus)}</Badge>
                    </div>
                  </div>
                  {report.priority?.reasons.length ? (
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
                      {report.priority.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
                    {report.summary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ButtonLink href={`/admin/reports/${encodeURIComponent(report.sessionId)}`} size="sm">
                      Open integrity report
                      <ArrowRight className="size-4" aria-hidden />
                    </ButtonLink>
                    <ButtonLink
                      href={`/admin/live/${encodeURIComponent(report.sessionId)}`}
                      variant="secondary"
                      size="sm"
                    >
                      Review timeline
                    </ButtonLink>
                  </div>
                </Card>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
