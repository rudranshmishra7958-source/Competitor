"use client";

import { useEffect, useRef, useState } from "react";
import { Minimize2, Maximize2, VideoOff } from "lucide-react";
import type { MonitorEvent, MonitorEventType, WebcamPolicy } from "@exam/shared";
import { postMonitorEvent, uploadSnapshot } from "@/lib/api";
import { CameraRules, type CameraEmission, type CameraSample } from "@/lib/proctor/detectors";
import { FrameProbe, captureJpeg, looksVirtual } from "@/lib/proctor/frame";
import { detectFaces, detectFraming, detectObjects, loadVision } from "@/lib/proctor/vision";
import { cameraWarningMessage, type ViolationNotice } from "@/lib/student-warnings";

export type CameraStatus = "starting" | "live" | "blocked" | "unavailable";

const TICK_MS = 350;

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>("starting");
  const [faceVisible, setFaceVisible] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const callbacks = useRef({ onIncident, onStatus });
  callbacks.current = { onIncident, onStatus };

  useEffect(() => {
    let stopped = false;
    const videoElement = videoRef.current;
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
      if (frame % 3 === 1 && (policy.detectDevices || policy.detectSecondPerson)) {
        sample.objects = detectObjects(models, video) ?? undefined;
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
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
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
      if (videoElement) videoElement.srcObject = null;
    };
  }, [sessionId, examId, studentId, policy]);

  const dot =
    status === "live" ? (faceVisible ? "bg-red-500" : "bg-amber-400") : "bg-[var(--muted)]";
  return (
    <aside
      aria-label="Your camera"
      className={`surface-float fixed right-3 top-20 z-30 overflow-hidden rounded-2xl transition-all ${
        minimized ? "w-28" : "w-44 sm:w-56"
      }`}
    >
      <div className="relative">
        <video
          ref={videoRef}
          muted
          playsInline
          className="aspect-[4/3] w-full -scale-x-100 bg-black object-cover"
        />
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
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className={`size-2 rounded-full ${dot} ${status === "live" ? "animate-pulse" : ""}`} aria-hidden />
          {minimized ? "Monitored" : "Monitored · snapshots only"}
        </span>
        <button
          type="button"
          onClick={() => setMinimized((v) => !v)}
          aria-label={minimized ? "Enlarge camera preview" : "Shrink camera preview"}
          className="grid size-6 place-items-center rounded-md hover:bg-[var(--nav-active-bg)]"
        >
          {minimized ? <Maximize2 className="size-3.5" aria-hidden /> : <Minimize2 className="size-3.5" aria-hidden />}
        </button>
      </div>
    </aside>
  );
}
