"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { GripHorizontal, Minimize2, Maximize2, VideoOff } from "lucide-react";
import type { MonitorEvent, MonitorEventType, WebcamPolicy } from "@exam/shared";
import { postMonitorEvent, uploadSnapshot } from "@/lib/api";
import { CameraRules, type CameraEmission, type CameraSample } from "@/lib/proctor/detectors";
import { FrameProbe, captureJpeg, looksVirtual } from "@/lib/proctor/frame";
import { detectFaces, detectFraming, detectObjects, loadVision, type DetectionBox } from "@/lib/proctor/vision";
import { cameraWarningMessage, type ViolationNotice } from "@/lib/student-warnings";

export type CameraStatus = "starting" | "live" | "blocked" | "unavailable";

const TICK_MS = 350;
const CORNER_KEY = "vigil-camera-corner";
type Corner = "tr" | "br" | "bl" | "tl";
const CORNERS: Corner[] = ["tr", "br", "bl", "tl"];

/**
 * Webcam proctoring for one attempt. Analysis runs on this device; only events and
 * occasional JPEG stills are sent. The stream is stopped when the component unmounts
 * (submit, timeout, or leaving the page) and nothing is recorded as video.
 */
export function ProctorCamera({
  sessionId,
  examId,
  studentId,
  policy,
  onIncident,
  onStatus,
}: {
  sessionId: string;
  examId: string;
  studentId: string;
  policy: WebcamPolicy;
  onIncident: (notice: ViolationNotice) => void;
  onStatus?: (status: CameraStatus) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The preview renders in a portal, so the element may appear after the stream starts.
  const attachVideo = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current && node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current;
      void node.play().catch(() => undefined);
    }
  }, []);
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [faceVisible, setFaceVisible] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [corner, setCorner] = useState<Corner>("tr");
  const [drift, setDrift] = useState(0);
  const [typing, setTyping] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [debug, setDebug] = useState(false);
  const [boxes, setBoxes] = useState<DetectionBox[]>([]);
  const callbacks = useRef({ onIncident, onStatus });
  callbacks.current = { onIncident, onStatus };

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let tick: number | null = null;
    let periodic: number | null = null;
    const rules = new CameraRules(policy);
    const probe = new FrameProbe();
    const pendingSnapshots = new Map<string, Promise<number | null>>();
    let frame = 0;

    const report = (next: CameraStatus) => {
      setStatus(next);
      callbacks.current.onStatus?.(next);
    };

    const send = async (type: MonitorEventType, metadata: Record<string, unknown> = {}) => {
      const event: MonitorEvent = {
        type,
        timestamp: new Date().toISOString(),
        examId,
        studentId,
        sessionId,
        source: "browser",
        metadata: { sensor: "camera", ...metadata },
      };
      const result = await postMonitorEvent(event);
      return result === "offline" ? null : result;
    };

    const snapshot = async (kind: "periodic" | "incident" | "reference", eventType?: string) => {
      const video = videoRef.current;
      if (!video) return null;
      const blob = await captureJpeg(video);
      return blob ? uploadSnapshot(sessionId, blob, kind, eventType) : null;
    };

    const warn = (type: string, metadata: Record<string, unknown>, points?: number, total?: number) =>
      callbacks.current.onIncident({
        message: cameraWarningMessage(type, metadata),
        effectiveType: type,
        pointsAdded: points,
        totalScore: total,
        source: "client",
      });

    const handle = async (emission: CameraEmission) => {
      const { type } = emission;
      // Leaving the seat and losing framing are reported once they end, with their full duration.
      const durational = type === "face_absent" || type === "framing_lost";
      if (emission.stage === "open") {
        const shot = snapshot("incident", type);
        pendingSnapshots.set(type, shot);
        if (durational) {
          warn(type, emission.metadata);
          return;
        }
        const snapshotId = await shot;
        const result = await send(type, { ...emission.metadata, snapshotId: snapshotId ?? undefined });
        warn(type, emission.metadata, result?.violation?.pointsAdded, result?.violation?.totalScore);
        return;
      }
      if (!durational) return;
      const snapshotId = await (pendingSnapshots.get(type) ?? Promise.resolve(null));
      pendingSnapshots.delete(type);
      await send(type, { ...emission.metadata, durationMs: emission.durationMs, snapshotId: snapshotId ?? undefined });
    };

    const analyse = async () => {
      const video = videoRef.current;
      if (stopped || !video || video.readyState < 2) return;
      const models = await loadVision().catch(() => null);
      if (stopped || !models) return;
      frame += 1;
      const { dark, frozen } = probe.sample(video);
      const faces = detectFaces(models, video);
      const sample: CameraSample = {
        at: Date.now(),
        faces: faces.count,
        faceConfidence: faces.confidence,
        dark,
        frozen,
      };
      if (frame % 3 === 0) {
        const framing = detectFraming(models, video);
        sample.framed = framing.framed;
        sample.posePeople = framing.people;
      }
      // Objects every other tick (~1.4/s): phones are small and often only briefly in view.
      if (frame % 2 === 1 && (policy.detectDevices || policy.detectSecondPerson)) {
        const objects = detectObjects(models, video);
        sample.objects = objects ?? undefined;
        if (debug) setBoxes(objects?.boxes ?? []);
      }
      setFaceVisible(faces.count > 0);
      for (const emission of rules.update(sample)) void handle(emission);
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        report("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
      } catch {
        report("blocked");
        void send("camera_blocked", { reason: "permission_denied", confidence: 1 });
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const track = stream.getVideoTracks()[0];
      track.addEventListener("ended", () => {
        if (stopped) return;
        report("blocked");
        void send("camera_blocked", { reason: "track_ended", confidence: 1 });
        warn("camera_blocked", {});
      });
      streamRef.current = stream;
      if (videoRef.current) attachVideo(videoRef.current);
      report("live");
      void send("camera_started", { label: track.label ? "webcam" : "unknown" });
      if (looksVirtual(track.label)) {
        const snapshotId = await snapshot("incident", "virtual_camera");
        const result = await send("virtual_camera", { confidence: 0.95, snapshotId: snapshotId ?? undefined });
        warn("virtual_camera", {}, result?.violation?.pointsAdded, result?.violation?.totalScore);
      }
      void loadVision();
      tick = window.setInterval(() => void analyse(), TICK_MS);
      periodic = window.setInterval(
        () => void snapshot("periodic"),
        Math.max(15, policy.periodicSnapshotSeconds) * 1000,
      );
      window.setTimeout(() => void snapshot("periodic"), 4000);
    };

    void start();

    return () => {
      stopped = true;
      if (tick) window.clearInterval(tick);
      if (periodic) window.clearInterval(periodic);
      // Report anything still in progress (e.g. the student is away when time runs out).
      for (const emission of rules.flush(Date.now())) void handle(emission);
      void send("camera_stopped", {});
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [sessionId, examId, studentId, policy, debug, attachVideo]);

  // Corner docking: remembered per browser, snapped after a drag.
  useEffect(() => {
    let saved: Corner | null = null;
    try {
      saved = localStorage.getItem(CORNER_KEY) as Corner | null;
    } catch {
      /* storage unavailable */
    }
    setCorner(saved && CORNERS.includes(saved) ? saved : window.innerWidth >= 640 ? "tr" : "br");
    // On phones start as the small pill so it never covers answer options.
    if (window.innerWidth < 640) setMinimized(true);
    setDebug(new URLSearchParams(window.location.search).has("camdebug"));
  }, []);

  // Follow scrolling with a small, eased lag so the preview feels attached to the page.
  useEffect(() => {
    let last = window.scrollY;
    let reset: number | null = null;
    const onScroll = () => {
      const delta = window.scrollY - last;
      last = window.scrollY;
      setDrift(Math.max(-28, Math.min(28, -delta * 0.9)));
      if (reset) window.clearTimeout(reset);
      reset = window.setTimeout(() => setDrift(0), 180);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (reset) window.clearTimeout(reset);
    };
  }, []);

  // Shrink to a small pill while the student types an answer, so it never competes for attention.
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && (el as HTMLInputElement).type === "text"));
    const onIn = (e: FocusEvent) => isField(e.target) && setTyping(true);
    const onOut = (e: FocusEvent) => isField(e.target) && setTyping(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  function startDrag(event: React.PointerEvent) {
    if (event.button !== 0) return;
    const onUp = (up: PointerEvent) => {
      window.removeEventListener("pointerup", onUp);
      const vertical = up.clientY < window.innerHeight / 2 ? "t" : "b";
      const horizontal = up.clientX < window.innerWidth / 2 ? "l" : "r";
      const next = `${vertical}${horizontal}` as Corner;
      setCorner(next);
      setDragging(false);
      try {
        localStorage.setItem(CORNER_KEY, next);
      } catch {
        /* storage unavailable */
      }
    };
    setDragging(true);
    window.addEventListener("pointerup", onUp);
  }

  const compact = minimized || typing;
  const dot = status === "live" ? (faceVisible ? "bg-red-500" : "bg-amber-400") : "bg-muted-foreground";
  const position = {
    tr: "right-3 top-20",
    br: "right-3 bottom-3",
    bl: "left-3 bottom-3",
    tl: "left-3 top-20",
  }[corner];

  return (
    <Portal>
    <aside
      aria-label="Your camera"
      style={{ transform: `translateY(${drift}px)` }}
      className={`fixed z-30 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-float)] transition-[transform,opacity,width] duration-300 ease-out motion-reduce:transition-none ${position} ${
        compact ? "w-28" : "w-40 sm:w-44"
      } ${dragging ? "cursor-grabbing opacity-60" : "opacity-75 hover:opacity-100 focus-within:opacity-100"}`}
    >
      <div className={`relative ${compact ? "h-px overflow-hidden opacity-0" : ""}`}>
        <video ref={attachVideo} muted playsInline className="aspect-[4/3] w-full -scale-x-100 bg-black object-cover" />
        {debug && boxes.length ? (
          <svg viewBox="0 0 1 1" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full -scale-x-100" aria-hidden>
            {boxes.map((box, index) => (
              <g key={index}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  fill="none"
                  stroke={box.label === "person" ? "#9fb48a" : "#e5735c"}
                  strokeWidth="0.008"
                />
              </g>
            ))}
          </svg>
        ) : null}
        {debug && boxes.length ? (
          <ul className="absolute left-1 top-1 space-y-0.5 text-[10px] text-white">
            {boxes.map((box, index) => (
              <li key={index} className="rounded bg-black/70 px-1">
                {box.label} {Math.round(box.score * 100)}%
              </li>
            ))}
          </ul>
        ) : null}
        {status !== "live" ? (
          <div className="absolute inset-0 grid place-items-center bg-black/70 p-2 text-center text-xs text-white">
            <span className="flex flex-col items-center gap-1">
              <VideoOff className="size-5" aria-hidden />
              {status === "starting"
                ? "Starting camera…"
                : status === "blocked"
                  ? "Camera blocked. Allow it in the address bar to continue."
                  : "Camera not available in this browser."}
            </span>
          </div>
        ) : !faceVisible ? (
          <div className="absolute inset-x-0 bottom-0 bg-amber-500/90 px-2 py-1 text-center text-[11px] font-medium text-black">
            Face not visible
          </div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px]">
        <button
          type="button"
          onPointerDown={startDrag}
          aria-label="Drag to move the camera preview to another corner"
          className="grid size-6 cursor-grab place-items-center rounded-md text-muted-foreground hover:bg-muted"
        >
          <GripHorizontal className="size-3.5" aria-hidden />
        </button>
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
          <span className={`size-2 shrink-0 rounded-full ${dot} ${status === "live" ? "animate-pulse" : ""}`} aria-hidden />
          <span className="truncate">{compact ? "Monitored" : "Monitored · stills only"}</span>
        </span>
        <button
          type="button"
          onClick={() => setMinimized((v) => !v)}
          aria-label={minimized ? "Enlarge camera preview" : "Shrink camera preview"}
          className="grid size-6 place-items-center rounded-md hover:bg-muted"
        >
          {minimized ? <Maximize2 className="size-3.5" aria-hidden /> : <Minimize2 className="size-3.5" aria-hidden />}
        </button>
      </div>
    </aside>
    </Portal>
  );
}
