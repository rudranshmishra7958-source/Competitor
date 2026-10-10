"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Gauge,
  Link2,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Incident, PriorityLevel, ReviewPriority, SnapshotInfo } from "@exam/shared";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { snapshotObjectUrl } from "@/lib/api";
import { sentence } from "@/lib/utils";

const LEVEL_TONE: Record<PriorityLevel, "low" | "medium" | "high"> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "high",
};

function time(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Loads an admin-only snapshot through the authenticated API and shows it. */
export function SnapshotImage({
  id,
  alt,
  className,
}: {
  id: number;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let current: string | null = null;
    void snapshotObjectUrl(id).then((value) => {
      if (revoked) {
        if (value) URL.revokeObjectURL(value);
        return;
      }
      current = value;
      setUrl(value);
    });
    return () => {
      revoked = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [id]);
  if (!url) {
    return <div className={`animate-pulse bg-[var(--border)] ${className ?? ""}`} aria-label="Loading snapshot" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={`object-cover ${className ?? ""}`} />;
}

export function PriorityBadge({ priority }: { priority?: ReviewPriority }) {
  if (!priority) return null;
  return (
    <Badge tone={LEVEL_TONE[priority.level]} icon={<Gauge className="size-3.5" aria-hidden />} >
      {sentence(priority.level)} priority · {priority.score}
    </Badge>
  );
}

export function PriorityPanel({
  priority,
  ruleVersion,
}: {
  priority: ReviewPriority;
  ruleVersion?: string;
}) {
  const strong = priority.evidenceStrength === "strong" || priority.evidenceStrength === "moderate";
  return (
    <Card strong className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className={`grid size-20 shrink-0 place-items-center rounded-2xl text-center ${
            priority.level === "critical" || priority.level === "high"
              ? "bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]"
              : priority.level === "medium"
                ? "bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]"
                : "bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]"
          }`}
        >
          <span>
            <span className="block text-2xl font-medium tabular-nums">{priority.score}</span>
            <span className="block text-[11px] font-medium">{sentence(priority.level)}</span>
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Review priority</p>
          {priority.reasons.length ? (
            <ul className="mt-1 space-y-1 text-sm">
              {priority.reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--risk-medium-fg)]" aria-hidden />
                  {reason}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm">Nothing needs attention in this session.</p>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <TrustItem
          label="Evidence"
          value={priority.evidenceStrength}
          good={strong}
          hint="Strong = corroborated by another source and backed by a snapshot"
        />
        <TrustItem
          label="Corroborated"
          value={`${priority.corroboratedIncidents} of ${priority.corroboratedIncidents + priority.singleSourceIncidents}`}
          good={priority.corroboratedIncidents > 0}
          hint="Incidents confirmed by a second signal within 30 seconds"
        />
        <TrustItem
          label="Camera uptime"
          value={priority.webcam && priority.cameraUptime !== null ? `${Math.round(priority.cameraUptime * 100)}%` : "Not used"}
          good={priority.webcam ? (priority.cameraUptime ?? 0) > 0.95 : null}
          hint="Share of the exam the camera was not covered or off"
        />
        <TrustItem
          label="Snapshots"
          value={String(priority.snapshotCount)}
          good={null}
          hint="Stills kept for review; no video is stored"
        />
      </dl>
      <p className="text-xs text-muted-foreground">
        Priority ranks where to look first; it is not a verdict. Rule version {ruleVersion ?? "risk-v3.0"}.
      </p>
    </Card>
  );
}

function TrustItem({
  label,
  value,
  good,
  hint,
}: {
  label: string;
  value: string;
  good: boolean | null;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2" title={hint}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1 font-medium">
        {good === true ? (
          <ShieldCheck className="size-3.5 text-[var(--risk-low-fg)]" aria-hidden />
        ) : good === false ? (
          <ShieldAlert className="size-3.5 text-[var(--risk-medium-fg)]" aria-hidden />
        ) : null}
        {sentence(value)}
      </dd>
    </div>
  );
}

export function CheckFirstList({
  incidents,
  onOpenSnapshot,
}: {
  incidents: Incident[];
  onOpenSnapshot: (id: number) => void;
}) {
  if (!incidents.length) {
    return (
      <p className="surface rounded-2xl px-4 py-6 text-center text-sm text-muted-foreground">
        No incidents to review.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {incidents.slice(0, 6).map((incident, index) => (
        <Card as="li" key={incident.id} className="flex flex-wrap gap-4 p-4 sm:flex-nowrap">
          <span className="w-5 shrink-0 pt-0.5 text-sm tabular-nums text-muted-foreground">{index + 1}.</span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{incident.title}</p>
              <Badge tone={incident.priority >= 6 ? "high" : incident.priority >= 3 ? "medium" : "low"}>
                Priority {incident.priority}
              </Badge>
              <Badge>{sentence(incident.category)}</Badge>
              {!incident.scored ? <Badge>Log only</Badge> : null}
            </div>
            <p className="mt-1 text-muted-foreground">{incident.reason}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                {time(incident.startedAt)}
                {incident.durationSeconds >= 1 ? ` · ${Math.round(incident.durationSeconds)} s` : ""}
              </span>
              <span>Confidence {Math.round(incident.confidence * 100)}%</span>
              <span className="inline-flex items-center gap-1">
                <Link2 className="size-3.5" aria-hidden />
                {incident.corroboratedBy.length
                  ? `Corroborated by ${incident.corroboratedBy.join(", ").replaceAll("_", " ")}`
                  : "Single source"}
              </span>
              {incident.devices.length ? <span>Seen: {incident.devices.join(", ")}</span> : null}
            </p>
          </div>
          {incident.snapshotIds.length ? (
            <div className="flex gap-2 self-start">
              {incident.snapshotIds.slice(0, 2).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenSnapshot(id)}
                  className="overflow-hidden rounded-xl border border-border hover:border-[var(--border-strong)]"
                  aria-label={`Open snapshot for ${incident.title}`}
                >
                  <SnapshotImage id={id} alt={incident.title} className="h-20 w-28" />
                </button>
              ))}
            </div>
          ) : null}
        </Card>
      ))}
    </ol>
  );
}

const KIND_LABEL: Record<SnapshotInfo["kind"], string> = {
  reference: "Reference",
  periodic: "Routine",
  incident: "Incident",
};

export function SnapshotFilmstrip({
  snapshots,
  activeId,
  onOpen,
}: {
  snapshots: SnapshotInfo[];
  activeId: number | null;
  onOpen: (id: number) => void;
}) {
  if (!snapshots.length) return null;
  return (
    <ul className="flex gap-3 overflow-x-auto pb-2" aria-label="Snapshot timeline">
      {snapshots.map((snap) => (
        <li key={snap.id} className="shrink-0">
          <button
            type="button"
            onClick={() => onOpen(snap.id)}
            className={`block overflow-hidden rounded-xl border-2 text-left ${
              activeId === snap.id
                ? "border-foreground"
                : snap.kind === "incident"
                  ? "border-[var(--risk-high-fg)]/60"
                  : "border-transparent"
            }`}
          >
            <SnapshotImage id={snap.id} alt={`${KIND_LABEL[snap.kind]} snapshot`} className="h-24 w-32" />
            <span className="block px-2 py-1 text-[11px]">
              <span className={snap.kind === "incident" ? "font-medium text-[var(--risk-high-fg)]" : ""}>
                {KIND_LABEL[snap.kind]}
                {snap.eventType ? ` · ${snap.eventType.replaceAll("_", " ")}` : ""}
              </span>
              <span className="block text-muted-foreground">{time(snap.createdAt)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Full-size viewer with the reference photo alongside for identity comparison. */
export function SnapshotLightbox({
  snapshots,
  openId,
  onClose,
  onNavigate,
}: {
  snapshots: SnapshotInfo[];
  openId: number | null;
  onClose: () => void;
  onNavigate: (id: number) => void;
}) {
  const index = snapshots.findIndex((s) => s.id === openId);
  const current = index >= 0 ? snapshots[index] : null;
  const reference = snapshots.find((s) => s.kind === "reference");

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && index < snapshots.length - 1) onNavigate(snapshots[index + 1].id);
      if (e.key === "ArrowLeft" && index > 0) onNavigate(snapshots[index - 1].id);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [current, index, snapshots, onClose, onNavigate]);

  if (!current) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Snapshot viewer">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="surface-float rise relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium">
            {KIND_LABEL[current.kind]}
            {current.eventType ? ` · ${current.eventType.replaceAll("_", " ")}` : ""} · {time(current.createdAt)}
            <span className="ml-2 font-normal text-muted-foreground">
              {index + 1} / {snapshots.length}
            </span>
          </p>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            aria-label="Close viewer"
            className="grid size-9 place-items-center rounded-xl hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className={`grid gap-3 ${reference && reference.id !== current.id ? "sm:grid-cols-[2fr_1fr]" : ""}`}>
          <SnapshotImage id={current.id} alt="Selected snapshot" className="aspect-[4/3] w-full rounded-xl" />
          {reference && reference.id !== current.id ? (
            <div>
              <SnapshotImage id={reference.id} alt="Reference photo from the camera check" className="aspect-[4/3] w-full rounded-xl" />
              <p className="mt-1 text-xs text-muted-foreground">Reference from the pre-exam camera check</p>
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex justify-between">
          <button
            type="button"
            disabled={index <= 0}
            onClick={() => onNavigate(snapshots[index - 1].id)}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </button>
          <button
            type="button"
            disabled={index >= snapshots.length - 1}
            onClick={() => onNavigate(snapshots[index + 1].id)}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl px-3 text-sm hover:bg-muted disabled:opacity-40"
          >
            Next <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

