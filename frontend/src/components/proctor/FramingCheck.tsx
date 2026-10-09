"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, ScanFace } from "lucide-react";
import { captureJpeg } from "@/lib/proctor/frame";
import { detectFaces, detectFraming, loadVision } from "@/lib/proctor/vision";

const STABLE_MS = 3000;

/**
 * Pre-exam camera check: one face, both shoulders, and room below for the desk surface,
 * held steady for 3 seconds. Hands back a reference still for the proctor.
 */
export function FramingCheck({ onReady }: { onReady: (reference: Blob | null) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"starting" | "checking" | "ready" | "blocked" | "error">("starting");
  const [hint, setHint] = useState("Starting camera…");
  const [progress, setProgress] = useState(0);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let goodSince: number | null = null;
    let done = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });
      } catch {
        setState("blocked");
        setHint("Camera permission was denied. Allow the camera in the address bar, then reload.");
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      setHint("Loading on-device analysis…");
      const models = await loadVision().catch(() => null);
      if (!models) {
        setState("error");
        setHint("Camera analysis could not load. Ask your proctor; run `npm run setup:vision`.");
        return;
      }
      setState("checking");
      timer = window.setInterval(async () => {
        if (done || !videoRef.current || videoRef.current.readyState < 2) return;
        const faces = detectFaces(models, videoRef.current);
        const framing = detectFraming(models, videoRef.current);
        let message = framing.hint;
        let good = framing.framed;
        if (faces.count === 0) {
          good = false;
          message = "Your face is not visible. Face the camera.";
        } else if (faces.count > 1 || framing.people > 1) {
          good = false;
          message = "Only you should be in view.";
        }
        const now = Date.now();
        goodSince = good ? (goodSince ?? now) : null;
        const held = goodSince ? now - goodSince : 0;
        setProgress(Math.min(1, held / STABLE_MS));
        setHint(good ? (held >= STABLE_MS ? "Framing confirmed." : "Hold still…") : message);
        if (good && held >= STABLE_MS) {
          done = true;
          if (timer) window.clearInterval(timer);
          const reference = await captureJpeg(videoRef.current);
          setState("ready");
          readyRef.current(reference);
        }
      }, 400);
    })();

    return () => {
      done = true;
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,18rem)_1fr] sm:items-start">
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
        <video ref={videoRef} muted playsInline className="aspect-[4/3] w-full -scale-x-100 object-cover" />
        {/* Framing guide: head near the top, desk across the bottom band */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute left-1/2 top-[10%] h-[38%] w-[34%] -translate-x-1/2 rounded-[50%] border-2 border-dashed border-white/60" />
          <div className="absolute inset-x-[6%] bottom-[4%] h-[18%] rounded-lg border-2 border-dashed border-white/40" />
          <span className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider text-white/70">
            desk surface
          </span>
        </div>
      </div>
      <div className="text-sm">
        <p className="flex items-center gap-2 font-semibold">
          {state === "ready" ? (
            <CheckCircle2 className="size-5 text-[var(--risk-low-fg)]" aria-hidden />
          ) : state === "checking" || state === "starting" ? (
            <Loader2 className="size-5 animate-spin text-[var(--nav-active-fg)]" aria-hidden />
          ) : (
            <ScanFace className="size-5 text-[var(--risk-high-fg)]" aria-hidden />
          )}
          Camera framing
        </p>
        <p className="mt-1 text-[var(--muted)]" role="status" aria-live="polite">
          {hint}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]" aria-hidden>
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.round((state === "ready" ? 1 : progress) * 100)}%` }}
          />
        </div>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[var(--muted)]">
          <li>Your face fits inside the oval, with both shoulders visible.</li>
          <li>Tilt the camera down until the desk in front of you shows in the lower band.</li>
          <li>Good, even lighting; no one else in view.</li>
        </ul>
      </div>
    </div>
  );
}
