"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { IntegrityReport } from "@exam/shared";
import { EventTimelineList } from "@/components/EventTimelineList";
import { PageHeader } from "@/components/PageHeader";
import { RiskChip } from "@/components/RiskChip";
import { downloadReport, fetchReport } from "@/lib/api";
import { assuranceLabel, reviewLabel } from "@/lib/assurance-labels";
import { getExam } from "@/lib/exam-store";

export default function IntegrityReportPage() {
  const params = useParams<{ sessionId: string }>();
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [message, setMessage] = useState("");

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
        <p className="text-sm text-[var(--muted)]">Loading report…</p>
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
        <Link
          href={`/admin/live/${encodeURIComponent(report.sessionId)}`}
          className="text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Open live timeline and set Flagged or Cleared
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <RiskChip level={report.risk} />
          <span className="rounded-full bg-[var(--exam-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--cyan)]">
            {reviewLabel(report.reviewStatus)}
          </span>
          <span className="text-sm text-[var(--muted)]">{assuranceLabel(report.assurance)}</span>
        </div>
        <p className="mt-4 text-base leading-relaxed">{report.summary}</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Browser score" value={report.breakdown.browser} />
        <Metric label="Agent score" value={report.breakdown.endpoint} />
        <Metric label="Correlated" value={report.breakdown.correlated} />
        <Metric label="Total" value={report.breakdown.total} />
        <Metric label="Events" value={`${scored} scored · ${logged} log-only`} wide />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download("pdf")}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Export PDF
        </button>
        <button
          type="button"
          onClick={() => download("csv")}
          className="rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium"
        >
          Export CSV
        </button>
        {message ? <span className="self-center text-sm text-[var(--muted)]">{message}</span> : null}
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
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
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
    <div
      className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 ${wide ? "sm:col-span-2 lg:col-span-1" : ""}`}
    >
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
