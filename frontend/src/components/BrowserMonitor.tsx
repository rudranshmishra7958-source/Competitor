"use client";

import { useEffect, useRef, useState } from "react";
import type { ExamSecurityPolicy, MonitorEvent, MonitorEventType } from "@exam/shared";
import {
  authenticatedEventsWsUrl,
  postMonitorEvent,
  type EventIngestResult,
} from "@/lib/api";
import { effectiveType, isScoredViolation, violationPoints } from "@/lib/policy-scoring";
import { studentViolationMessage, type ViolationNotice } from "@/lib/student-warnings";

const BUFFER_KEY = "exam_monitor_v1";
const MAX_EVENTS = 400;

function readBuffer(): MonitorEvent[] {
  try {
    return JSON.parse(localStorage.getItem(BUFFER_KEY) ?? "[]") as MonitorEvent[];
  } catch {
    return [];
  }
}

export function appendMonitorEvent(event: MonitorEvent): void {
  const next = [...readBuffer(), event].slice(-MAX_EVENTS);
  localStorage.setItem(BUFFER_KEY, JSON.stringify(next));
  console.info("[monitor]", event.type, event);
}

export function loadMonitorEvents(examId?: string): MonitorEvent[] {
  const all = readBuffer();
  return examId ? all.filter((e) => e.examId === examId) : all;
}

function buildEvent(
  type: MonitorEventType,
  ctx: { examId: string; studentId: string; sessionId: string },
  metadata: Record<string, unknown> = {},
): MonitorEvent {
  return {
    type,
    timestamp: new Date().toISOString(),
    examId: ctx.examId,
    studentId: ctx.studentId,
    sessionId: ctx.sessionId,
    source: "browser",
    metadata,
  };
}

let activeSocket: WebSocket | null = null;

function noticeFromServer(violation: NonNullable<EventIngestResult["violation"]>): ViolationNotice {
  return {
    message: studentViolationMessage(violation.effectiveType, {
      application: violation.application,
    }),
    application: violation.application,
    pointsAdded: violation.pointsAdded,
    totalScore: violation.totalScore,
    effectiveType: violation.effectiveType,
    source: "server",
  };
}

/**
 * Best-effort in-browser signals. Multi-monitor is not guaranteed.
 * Phase 6 will ship the same envelope over WebSocket.
 */
export function BrowserMonitor({
  examId,
  studentId,
  sessionId,
  policy,
  onCount,
  onViolation,
}: {
  examId: string;
  studentId: string;
  sessionId: string;
  policy?: ExamSecurityPolicy;
  onCount?: (count: number) => void;
  onViolation?: (notice: ViolationNotice) => void;
}) {
  const ctx = useRef({ examId, studentId, sessionId });
  ctx.current = { examId, studentId, sessionId };
  const onCountRef = useRef(onCount);
  onCountRef.current = onCount;
  const policyRef = useRef(policy);
  policyRef.current = policy;
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const c = () => ctx.current;
    const emit = (
      type: MonitorEventType,
      metadata: Record<string, unknown> = {},
    ) => {
      const event = buildEvent(type, c(), metadata);
      appendMonitorEvent(event);
      const currentPolicy = policyRef.current;
      const scored = currentPolicy
        ? isScoredViolation(currentPolicy, type, metadata)
        : false;
      void deliver(event, scored);
    };
    const deliver = async (event: MonitorEvent, scored: boolean) => {
      if (activeSocket?.readyState === WebSocket.OPEN) {
        activeSocket.send(JSON.stringify(event));
        return;
      }
      const result = await postMonitorEvent(event);
      if (result !== "offline" && result.violation?.scored) {
        onViolationRef.current?.(noticeFromServer(result.violation));
        return;
      }
      if (result === "offline" && scored) {
        const effective = effectiveType(event.type, event.metadata);
        onViolationRef.current?.({
          message: studentViolationMessage(effective),
          pointsAdded: violationPoints(event.type, event.metadata),
          effectiveType: effective,
          source: "client",
        });
      }
    };
    const onVis = () =>
      emit(document.hidden ? "visibility_hidden" : "visibility_visible", {
        visibilityState: document.visibilityState,
      });
    const onBlur = () => emit("window_blur");
    const onFocus = () => emit("window_focus");
    const onFs = () =>
      emit(document.fullscreenElement ? "fullscreen_enter" : "fullscreen_exit");
    const onCopy = (e: Event) => emit("clipboard_copy", { tag: (e.target as HTMLElement)?.tagName });
    const onCut = (e: Event) => emit("clipboard_cut", { tag: (e.target as HTMLElement)?.tagName });
    const onPaste = (e: Event) => emit("clipboard_paste", { tag: (e.target as HTMLElement)?.tagName });
    const onMenu = (e: MouseEvent) => {
      e.preventDefault();
      emit("contextmenu", { x: e.clientX, y: e.clientY });
    };
    const onKey = (e: KeyboardEvent) => {
      const dev =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.metaKey && e.altKey && (e.key === "i" || e.key === "I"));
      if (dev) emit("devtools_open", { key: e.key, heuristic: "keyboard" });
    };
    const lastDevtools = { t: 0 };
    const onResize = () => {
      const gap = Math.abs(window.outerWidth - window.innerWidth) > 160;
      if (!gap) return;
      const now = Date.now();
      if (now - lastDevtools.t < 4000) return;
      lastDevtools.t = now;
      emit("devtools_open", {
        heuristic: "window-chrome",
        outerWidth: window.outerWidth,
        innerWidth: window.innerWidth,
      });
    };
    const onLeave = () => emit("navigation_away", { path: location.pathname });

    const wsUrl = authenticatedEventsWsUrl();
    const ws = wsUrl ? new WebSocket(wsUrl) : null;
    if (ws) {
      activeSocket = ws;
      ws.onmessage = (message) => {
        try {
          const body = JSON.parse(message.data) as EventIngestResult;
          if (body.violation?.scored) {
            onViolationRef.current?.(noticeFromServer(body.violation));
          }
        } catch {
          /* ignore non-JSON acks */
        }
      };
      ws.onerror = () => {
        if (activeSocket === ws) activeSocket = null;
      };
    }

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onMenu);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("beforeunload", onLeave);

    const poll = window.setInterval(() => {
      const next = readBuffer().filter((e) => e.sessionId === sessionId).length;
      setCount(next);
      onCountRef.current?.(next);
    }, 1500);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onMenu);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("beforeunload", onLeave);
      window.clearInterval(poll);
      ws?.close();
      if (activeSocket === ws) activeSocket = null;
    };
  }, [sessionId]);

  return <span className="sr-only">Browser monitor is recording. {count} events this session.</span>;
}
