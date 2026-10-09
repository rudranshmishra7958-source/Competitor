"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOwnSession } from "@/lib/api";
import { studentViolationMessage, type ViolationNotice } from "@/lib/student-warnings";

const ENDPOINT_TYPES = new Set([
  "process_blacklisted",
  "foreground_app_changed",
  "multiple_displays",
  "display_state_changed",
  "virtual_machine",
]);

export function useSessionIntegrityAlerts(sessionId: string | null) {
  const [notice, setNotice] = useState<ViolationNotice | null>(null);
  const [score, setScore] = useState(0);
  const [endpointConnected, setEndpointConnected] = useState(false);
  const previousScore = useRef<number | null>(null);
  const lastAlert = useRef<{ type: string; at: number } | null>(null);

  const reportViolation = useCallback((next: ViolationNotice) => {
    const now = Date.now();
    const recent =
      lastAlert.current &&
      lastAlert.current.type === next.effectiveType &&
      now - lastAlert.current.at < 3000;
    lastAlert.current = { type: next.effectiveType, at: recent ? lastAlert.current!.at : now };
    setNotice((current) => (recent && current ? { ...current, ...next } : next));
    if (typeof next.totalScore === "number") {
      setScore(next.totalScore);
    } else if (!recent && typeof next.pointsAdded === "number") {
      setScore((current) => current + (next.pointsAdded ?? 0));
    }
  }, []);

  const dismiss = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const poll = async () => {
      const row = await fetchOwnSession(sessionId);
      if (!row || cancelled) return;
      setEndpointConnected(Boolean(row.endpointConnected));
      const total = row.breakdown.total;
      const previous = previousScore.current;
      previousScore.current = total;
      setScore(total);
      if (
        previous !== null &&
        total > previous &&
        ENDPOINT_TYPES.has(row.latestAnomaly)
      ) {
        reportViolation({
          message: studentViolationMessage(row.latestAnomaly, {
            application: row.latestAnomalyApplication ?? undefined,
          }),
          pointsAdded: total - previous,
          totalScore: total,
          effectiveType: row.latestAnomaly,
          source: "server",
        });
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId, reportViolation]);

  return { notice, dismiss, score, endpointConnected, reportViolation };
}
