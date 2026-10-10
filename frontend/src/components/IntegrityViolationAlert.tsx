"use client";

import { useEffect } from "react";
import { OctagonAlert, Video } from "lucide-react";
import { CAMERA_TYPES } from "@/lib/student-warnings";
import type { ViolationNotice } from "@/lib/student-warnings";

export function IntegrityViolationAlert({
  notice,
  onDismiss,
}: {
  notice: ViolationNotice;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, 8000);
    return () => window.clearTimeout(id);
  }, [notice, onDismiss]);

  const camera = CAMERA_TYPES.has(notice.effectiveType);
  const scoreLine =
    notice.pointsAdded != null || notice.totalScore != null
      ? `Integrity score${notice.pointsAdded != null ? `: +${notice.pointsAdded}` : ""}${
          notice.totalScore != null ? ` (total ${notice.totalScore})` : ""
        }`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-24 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-label={camera ? "You are being monitored" : "Integrity warning"}
        className="rise w-full max-w-md rounded-2xl border border-[var(--risk-high-fg)]/50 bg-card p-5 shadow-[var(--shadow-float)]"
      >
        <p className="flex items-center gap-2 text-sm font-medium text-[var(--risk-high-fg)]">
          {camera ? <Video className="size-4" aria-hidden /> : <OctagonAlert className="size-4" aria-hidden />}
          {camera ? "You are being monitored on camera" : "Integrity warning"}
        </p>
        <p className="mt-2 text-lg font-medium leading-snug">{notice.message}</p>
        {scoreLine ? <p className="mt-3 text-sm text-muted-foreground">{scoreLine}</p> : null}
        <button
          type="button"
          onClick={onDismiss}
          autoFocus
          className="mt-4 min-h-10 rounded-xl bg-[var(--risk-high-fg)] px-4 text-sm font-medium text-[var(--surface-solid)]"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
