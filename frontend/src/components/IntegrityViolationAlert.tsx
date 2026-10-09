"use client";

import { useEffect } from "react";
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

  const scoreLine =
    notice.pointsAdded != null || notice.totalScore != null
      ? `Integrity score${notice.pointsAdded != null ? `: +${notice.pointsAdded}` : ""}${
          notice.totalScore != null ? ` (total ${notice.totalScore})` : ""
        }`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 px-4 pt-24">
      <div
        role="alert"
        className="w-full max-w-md rounded-xl border-2 border-red-500 bg-[#3b0d0d] p-5 text-white shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-red-200">Integrity warning</p>
        <p className="mt-2 text-lg font-medium leading-snug">{notice.message}</p>
        {scoreLine ? <p className="mt-3 text-sm text-red-100">{scoreLine}</p> : null}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-4 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
