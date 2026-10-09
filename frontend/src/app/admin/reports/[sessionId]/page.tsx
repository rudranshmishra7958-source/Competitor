"use client";

import { ArrowRight, Download, FileText } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { IntegrityReport } from "@exam/shared";
import { EventTimelineList } from "@/components/EventTimelineList";
import {
  CheckFirstList,
  PriorityPanel,
  SnapshotFilmstrip,
  SnapshotLightbox,
} from "@/components/proctor/ReviewEvidence";
import { PageHeader } from "@/components/PageHeader";
import { RiskChip } from "@/components/RiskChip";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { downloadReport, fetchReport } from "@/lib/api";
import { assuranceLabel, reviewLabel } from "@/lib/assurance-labels";
import { getExam } from "@/lib/exam-store";

export default function IntegrityReportPage() {
  const params = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [message, setMessage] = useState("");
  const [openSnapshot, setOpenSnapshot] = useState<number | null>(null);

  useEffect(() => {
    const load = () => void fetchReport(params.sessionId).then(setReport);
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, [params.sessionId]);

  async function download(format: "csv" | "pdf") {
    setMessage((await downloadReport(params.sessionId, format)) ? "Download started." : "Export failed.");
  }

  if (!report) {
    return (
      <>
        <PageHeader title="Integrity report" />
        <Skeleton className="h-40" />
      </>
    );
  }

  const examTitle = getExam(report.examId)?.title ?? report.examId;
  const unsafe = report.events.filter((event) => event.scored);
  const scored = unsafe.length;
  const logged = report.events.length - scored;

  return (
    <>
      <PageHeader
        title={`${report.displayName} · integrity report`}
        description={`${examTitle}. Evidence for a human reviewer—not an automatic accusation.`}
      />
      <div className="mb-4">
        <ButtonLink href={`/admin/live/${encodeURIComponent(report.sessionId)}`} variant="secondary" size="sm">
          Open live timeline and set Flagged or Cleared
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>

      {report.priority ? (
        <PriorityPanel priority={report.priority} ruleVersion={report.ruleVersion} />
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Check these first</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Incidents ranked by priority: weight × detection confidence × corroboration × duration.
        </p>
        <div className="mt-3">
          <CheckFirstList incidents={report.incidents ?? []} onOpenSnapshot={setOpenSnapshot} />
        </div>
      </section>

      {report.snapshots?.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Snapshot timeline</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Routine and incident stills in exam order. Incident frames are outlined in red. No video is stored.
          </p>
          <div className="mt-3">
            <SnapshotFilmstrip snapshots={report.snapshots} activeId={openSnapshot} onOpen={setOpenSnapshot} />
          </div>
        </section>
      ) : null}

      <SnapshotLightbox
        snapshots={report.snapshots ?? []}
        openId={openSnapshot}
        onClose={() => setOpenSnapshot(null)}
        onNavigate={setOpenSnapshot}
      />

      <Card strong className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <RiskChip level={report.risk} />
          <Badge tone="accent">{reviewLabel(report.reviewStatus)}</Badge>
          <span className="text-sm text-[var(--muted)]">{assuranceLabel(report.assurance)}</span>
        </div>
        <p className="mt-4 text-base leading-relaxed">{report.summary}</p>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Browser score" value={report.breakdown.browser} />
        <Metric label="Agent score" value={report.breakdown.endpoint} />
        <Metric label="Correlated" value={report.breakdown.correlated} />
        <Metric label="Total" value={report.breakdown.total} />
        <Metric label="Events" value={`${scored} scored · ${logged} log-only`} wide />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={() => download("pdf")}>
          <FileText className="size-4" aria-hidden />
          Export PDF
        </Button>
        <Button variant="secondary" onClick={() => download("csv")}>
          <Download className="size-4" aria-hidden />
          Export CSV
        </Button>
        {message ? (
          <span className="text-sm text-[var(--muted)]" role="status">
            {message}
          </span>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">All activity (browser + agent)</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {report.events.length} event{report.events.length === 1 ? "" : "s"} from the browser and the endpoint agent.
        </p>
        <EventTimelineList events={report.events} variant="all" />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Unsafe — policy violations</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Actions the exam policy set to enforce. These add to the integrity score.
        </p>
        <EventTimelineList events={unsafe} variant="unsafe" />
        <h3 className="mt-6 text-base font-semibold">Score adjustments</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Rules that combined browser and agent signals, or other score additions.
        </p>
        {report.correlations.length ? (
          <ul className="mt-3 space-y-2">
            {report.correlations.map((hit) => (
              <li
                key={`${hit.rule}-${hit.label}-${hit.eventIds.join("-")}`}
                className="surface rounded-2xl px-4 py-3"
              >
                <p className="font-medium">{hit.label}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Rule {hit.rule} · +{hit.weight} · {hit.eventIds.length} linked event(s)
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">No extra score adjustments on this session.</p>
        )}
      </section>
    </>
  );
}

function Metric({ label, value, wide }: { label: string; value: number | string; wide?: boolean }) {
  return (
    <Card className={`p-4 ${wide ? "sm:col-span-2 lg:col-span-1" : ""}`}>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
