import type { TimelineEvent } from "@exam/shared";
import { Badge } from "@/components/ui/Badge";
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
            className={`glass rounded-2xl border-l-4 px-4 py-3 ${
              variant === "unsafe" || event.scored
                ? "!border-l-[var(--risk-high-fg)]"
                : "!border-l-[var(--accent)]"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{eventLabelForAdmin(labelType, event.metadata)}</span>
              <time className="text-xs text-[var(--muted)]">
                {new Date(event.timestamp).toLocaleString()}
              </time>
            </div>
            <p className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge tone="accent">{sourceLabel(event.source)}</Badge>
              {executable ? <span className="text-[var(--muted)]">{executable}</span> : null}
              {variant === "unsafe" ? (
                <span className="font-medium text-[var(--risk-high-fg)]">+{points} integrity points</span>
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
