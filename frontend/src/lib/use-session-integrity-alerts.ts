"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOwnSession } from "@/lib/api";
import {
  TAB_TYPES,
  combinedAppMessage,
  studentViolationMessage,
  type ViolationNotice,
} from "@/lib/student-warnings";

const APP_TYPES = new Set(["process_blacklisted", "foreground_app_changed"]);
/** A tab leave and the app the agent saw are treated as one action within this window. */
const MERGE_WINDOW_MS = 10_000;

export function useSessionIntegrityAlerts(sessionId: string | null) {
  const [notice, setNotice] = useState<ViolationNotice | null>(null);
  const [score, setScore] = useState(0);
  const [endpointConnected, setEndpointConnected] = useState(false);
  const previousScore = useRef<number | null>(null);
  const previousApp = useRef<string | null>(null);
  const lastAlert = useRef<{ type: string; at: number } | null>(null);
  const lastTab = useRef<{ type: string; at: number; app?: string } | null>(null);
  const lastApp = useRef<{ app: string; at: number } | null>(null);

  const reportViolation = useCallback((incoming: ViolationNotice) => {
    const now = Date.now();
    let next = incoming;

    // Name the app whenever we know it, so the student sees exactly what was recorded.
    if (TAB_TYPES.has(next.effectiveType)) {
      const app =
        next.application ?? (lastApp.current && now - lastApp.current.at < MERGE_WINDOW_MS ? lastApp.current.app : undefined);
      lastTab.current = { type: next.effectiveType, at: now, app };
      if (app) next = { ...next, application: app, message: combinedAppMessage(next.effectiveType, app) };
    } else if (APP_TYPES.has(next.effectiveType) && next.application) {
      lastApp.current = { app: next.application, at: now };
      const tab = lastTab.current;
      if (tab && now - tab.at < MERGE_WINDOW_MS) {
        next = { ...next, message: combinedAppMessage(tab.type, next.application) };
      }
    }

    const recent =
      lastAlert.current &&
      lastAlert.current.type === next.effectiveType &&
      now - lastAlert.current.at < 3000;
    lastAlert.current = { type: next.effectiveType, at: recent ? lastAlert.current!.at : now };
    setNotice((current) => {
      // An app report shortly after a tab-leave dialog updates that same dialog.
      if (
        current &&
        APP_TYPES.has(next.effectiveType) &&
        TAB_TYPES.has(current.effectiveType) &&
        lastTab.current &&
        now - lastTab.current.at < MERGE_WINDOW_MS
      ) {
        return {
          ...current,
          application: next.application,
          message: next.message,
          pointsAdded: (current.pointsAdded ?? 0) + (next.pointsAdded ?? 0),
          totalScore: next.totalScore ?? current.totalScore,
        };
      }
      return recent && current ? { ...current, ...next } : next;
    });
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
      const app = row.latestAnomalyApplication ?? null;
      const appIsNew = Boolean(app) && app !== previousApp.current;
      previousApp.current = app;
      // The agent reports apps directly to the server, so the browser learns about them here.
      if (previous !== null && total > previous && appIsNew && app) {
        reportViolation({
          message: studentViolationMessage("process_blacklisted", { application: app }),
          application: app,
          pointsAdded: total - previous,
          totalScore: total,
          effectiveType: "process_blacklisted",
          source: "server",
        });
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [sessionId, reportViolation]);

  return { notice, dismiss, score, endpointConnected, reportViolation };
}
