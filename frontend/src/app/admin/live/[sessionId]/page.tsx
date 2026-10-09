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
        <p className="text-sm text-[var(--muted)]">Loading server session…</p>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`${session.displayName} · session review`}
        description={`Exam ${session.examId}. Events are chronological and privacy-limited.`}
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <Summary label="Risk">
          <RiskChip level={session.risk} />
        </Summary>
        <Summary label="Browser">{session.breakdown.browser}</Summary>
        <Summary label="Endpoint">{session.breakdown.endpoint}</Summary>
        <Summary label="Correlated">{session.breakdown.correlated}</Summary>
      </div>

      <section className="mt-6 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="font-semibold">Reviewer decision</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["unreviewed", "flagged", "cleared"] as ReviewerStatus[]).map((value) => (
            <label key={value} className="flex items-center gap-1 text-sm capitalize">
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
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={saveReview}
          className="mt-3 rounded-md bg-[var(--accent)] px-3 py-2 text-sm text-white"
        >
          Save review
        </button>
        {message ? <p className="mt-2 text-sm text-[var(--muted)]">{message}</p> : null}
      </section>

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
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <div className="mt-2 text-xl font-semibold">{children}</div>
    </div>
  );
}
