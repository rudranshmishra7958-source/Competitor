"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type {
  LiveSessionRow,
  ReviewerStatus,
  TimelineEvent,
} from "@exam/shared";
import { EventTimelineList } from "@/components/EventTimelineList";
import { PageHeader } from "@/components/PageHeader";
import { RiskChip } from "@/components/RiskChip";
import { PriorityPanel } from "@/components/proctor/ReviewEvidence";
import { ButtonLink } from "@/components/ui/Button";
import { FileSearch } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchTimeline, updateReview } from "@/lib/api";

export default function SessionTimelinePage() {
  const params = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<LiveSessionRow | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [status, setStatus] = useState<ReviewerStatus>("unreviewed");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const result = await fetchTimeline(params.sessionId);
    if (!result) return;
    setSession(result.session);
    setEvents(result.events);
    setStatus(result.session.review.status);
    setNote(result.session.review.note);
  }

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sessionId]);

  async function saveReview() {
    const review = await updateReview(params.sessionId, status, note);
    setMessage(review ? "Review saved and audited." : "Could not save review.");
    if (review) setSession((current) => (current ? { ...current, review } : current));
  }

  if (!session) {
    return (
      <>
        <PageHeader title="Session timeline" />
        <Skeleton className="h-32" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${session.displayName} · session review`}
        description={`Exam ${session.examId}. Events are chronological and privacy-limited.`}
      />
      {session.priority ? (
        <div className="mb-4 space-y-3">
          <PriorityPanel priority={session.priority} />
          <ButtonLink href={`/admin/reports/${encodeURIComponent(session.sessionId)}`} variant="secondary" size="sm">
            <FileSearch className="size-4" aria-hidden />
            Open evidence report (ranked incidents and snapshots)
          </ButtonLink>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-4">
        <Summary label="Risk">
          <RiskChip level={session.risk} />
        </Summary>
        <Summary label="Browser">{session.breakdown.browser}</Summary>
        <Summary label="Endpoint">{session.breakdown.endpoint}</Summary>
        <Summary label="Correlated">{session.breakdown.correlated}</Summary>
      </div>

      <Card as="section" className="mt-6">
        <h2 className="font-semibold">Reviewer decision</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["unreviewed", "flagged", "cleared"] as ReviewerStatus[]).map((value) => (
            <label
              key={value}
              className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm capitalize ${
                status === value
                  ? "border-[var(--accent)] bg-[var(--nav-active-bg)] font-medium"
                  : "border-[var(--border)]"
              }`}
            >
              <input
                type="radio"
                name="review-status"
                checked={status === value}
                onChange={() => setStatus(value)}
              />
              {value}
            </label>
          ))}
        </div>
        <label className="mt-3 block text-sm">
          Review note
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            maxLength={1000}
            className="mt-1.5 w-full rounded-xl border border-[var(--border)] px-3 py-2"
          />
        </label>
        <Button onClick={saveReview} className="mt-3">
          Save review
        </Button>
        {message ? <p className="mt-2 text-sm text-[var(--muted)]">{message}</p> : null}
      </Card>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">All activity (browser + agent)</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {events.length} event{events.length === 1 ? "" : "s"} from the browser and the endpoint agent.
        </p>
        <EventTimelineList events={events} variant="all" />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Unsafe — policy violations</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Actions the exam policy set to enforce. These add to the integrity score.
        </p>
        <EventTimelineList events={events.filter((event) => event.scored)} variant="unsafe" />
      </section>
    </>
  );
}

function Summary({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <div className="mt-2 text-xl font-semibold tabular-nums">{children}</div>
    </Card>
  );
}
