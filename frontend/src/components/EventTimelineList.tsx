import type { TimelineEvent } from "@exam/shared";
import { formatForegroundDetail } from "@/lib/app-name";
import { eventLabelForAdmin, sourceLabel } from "@/lib/event-labels";
import { violationPoints } from "@/lib/policy-scoring";

export function EventTimelineList({
  events,
  variant,
}: {
  events: TimelineEvent[];
  variant: "all" | "unsafe";
}) {
  if (events.length === 0) {
    return (
      <p className="mt-2 text-sm text-[var(--muted)]">
        {variant === "unsafe"
          ? "No enforce-mode violations recorded for this session."
          : "No events recorded."}
      </p>
    );
  }

  return (
    <ol className="mt-3 space-y-2">
      {events.map((event) => {
        const labelType = variant === "unsafe" ? (event.effectiveType ?? event.type) : event.type;
        const executable = formatForegroundDetail(labelType, event.metadata) ?? formatForegroundDetail(event.type, event.metadata);
        const points =
          typeof event.points === "number"
            ? event.points
            : violationPoints(event.effectiveType ?? event.type, event.metadata ?? {});
        return (
          <li
            key={event.id}
            className={`rounded-lg border px-4 py-3 ${
              variant === "unsafe"
                ? "border-red-200 bg-red-50"
                : "border-[var(--border)] bg-[var(--surface)]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{eventLabelForAdmin(labelType, event.metadata)}</span>
              <time className="text-xs text-[var(--muted)]">
                {new Date(event.timestamp).toLocaleString()}
              </time>
            </div>
            <p className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[var(--exam-bg)] px-2 py-0.5 text-[var(--cyan)]">
                {sourceLabel(event.source)}
              </span>
              {executable ? <span className="text-[var(--muted)]">{executable}</span> : null}
              {variant === "unsafe" ? (
                <span className="font-medium text-red-700">+{points} integrity points</span>
              ) : (
                <span className="text-[var(--muted)]">
                  {event.scored ? "Counted by the scoring rule" : "Logged only"}
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
