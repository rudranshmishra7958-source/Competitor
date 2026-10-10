"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, ScanLine, TriangleAlert, Video } from "lucide-react";
import type { WrittenQuestion, WrittenSubmission } from "@exam/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { addWrittenSubmission, submissionsForStudent } from "@/lib/exam-store";
import { assessImageDataUrl, canvasToJpeg, fileToDataUrl } from "@/lib/image-quality";
import { sendMonitorEvent } from "@/lib/api";

export function WrittenCapture({
  examId,
  studentId,
  sessionId,
  question,
  disabled,
}: {
  examId: string;
  studentId: string;
  sessionId: string;
  question: WrittenQuestion;
  disabled?: boolean;
}) {
  const [history, setHistory] = useState(() =>
    submissionsForStudent(examId, studentId).filter((s) => s.questionId === question.id),
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function attachVideo(node: HTMLVideoElement | null) {
    videoRef.current = node;
    if (!node || !streamRef.current) return;
    node.srcObject = streamRef.current;
    void node.play().catch(() => {
      setError("The camera opened, but the preview could not start. Use Take photo or Upload scan.");
    });
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  function cameraErrorMessage(err: unknown): string {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return "Allow the camera in the address-bar prompt, then click Open camera again. You can also use Take photo or Upload scan.";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No camera was found on this computer. Use Upload scan.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return "The camera is in use by another app. Close that app, then try again, or use Upload scan.";
    }
    if (name === "SecurityError") {
      return "The camera only works at http://localhost:3000 in Chrome or Edge. Do not use the network IP, and do not use an embedded preview that cannot grant camera access.";
    }
    return "The camera could not start. Use Take photo or Upload scan.";
  }

  async function openVideoStream(): Promise<MediaStream> {
    const constraints = { video: true, audio: false } as const;
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (err instanceof DOMException && err.name === "OverconstrainedError") {
        return navigator.mediaDevices.getUserMedia(constraints);
      }
      throw err;
    }
  }

  async function startCamera() {
    if (disabled) return;
    setError(null);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Open this exam at http://localhost:3000 in Chrome or Edge. The camera is blocked on a network IP and in an embedded preview that cannot grant camera access. Upload scan still works.",
      );
      return;
    }
    try {
      stopCamera();
      const stream = await openVideoStream();
      streamRef.current = stream;
      setCameraOn(true);
      if (videoRef.current) attachVideo(videoRef.current);
    } catch (err) {
      setError(cameraErrorMessage(err));
    }
  }

  async function snapPhoto() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvasToJpeg(canvas);
    const quality = await assessImageDataUrl(dataUrl);
    setPreview(dataUrl);
    setWarnings(quality.warnings);
    stopCamera();
  }

  async function onFile(file: File | undefined) {
    if (!file || disabled) return;
    setError(null);
    setBusy(true);
    try {
      if (!file.type.startsWith("image/")) {
        setError("Upload a photo or scan (image file).");
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      const quality = await assessImageDataUrl(dataUrl);
      setPreview(dataUrl);
      setWarnings(quality.warnings);
    } catch {
      setError("Could not read that image.");
    } finally {
      setBusy(false);
    }
  }

  function submitPreview() {
    if (!preview || disabled) return;
    const submission = addWrittenSubmission(examId, studentId, question.id, preview);
    void sendMonitorEvent({
      type: "submission_saved",
      timestamp: submission.createdAt,
      examId,
      studentId,
      sessionId,
      source: "browser",
      metadata: {
        submissionId: submission.id,
        questionId: question.id,
        revision: history.length + 1,
      },
    });
    setHistory(submissionsForStudent(examId, studentId).filter((s) => s.questionId === question.id));
    setPreview(null);
    setWarnings([]);
  }

  const pickCls =
    "surface inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-4 text-sm font-medium hover:border-[var(--border-strong)] focus-within:ring-2 focus-within:ring-[var(--ring)]";

  return (
    <Card as="article" className="sm:p-6">
      <p className="text-lg font-medium leading-snug">{question.prompt}</p>
      {!disabled ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <label className={pickCls}>
            <ImagePlus className="size-4" aria-hidden />
            Upload scan
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <label className={pickCls}>
            <Camera className="size-4" aria-hidden />
            Take photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <Button variant="secondary" disabled={busy} onClick={() => void startCamera()}>
            <Video className="size-4" aria-hidden />
            Open camera
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          This exam window is closed. History below is still visible.
        </p>
      )}
      {cameraOn ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            This camera is only for photographing your written answer — not live proctoring.
          </p>
          <video
            ref={attachVideo}
            autoPlay
            playsInline
            muted
            className="max-h-72 w-full rounded-2xl bg-black"
          />
          <div className="flex gap-2">
            <Button onClick={snapPhoto}>
              <Camera className="size-4" aria-hidden />
              Capture
            </Button>
            <Button variant="secondary" onClick={stopCamera}>
              Close camera
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p
          className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--risk-high-bg)] px-3 py-2 text-sm text-[var(--risk-high-fg)]"
          role="alert"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      {preview ? (
        <div className="mt-4 space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview of written answer"
            className="max-h-72 rounded-2xl border border-border"
          />
          {warnings.length ? (
            <ul className="space-y-1 rounded-xl bg-[var(--risk-medium-bg)] px-3 py-2 text-sm text-[var(--risk-medium-fg)]">
              {warnings.map((w) => (
                <li key={w} className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {w}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--risk-low-fg)]">Looks readable.</p>
          )}
          <div className="flex gap-2">
            <Button onClick={submitPreview}>{warnings.length ? "Save anyway" : "Save this scan"}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPreview(null);
                setWarnings([]);
              }}
            >
              Retake
            </Button>
          </div>
        </div>
      ) : null}
      <HistoryList items={history} />
    </Card>
  );
}

function HistoryList({ items }: { items: WrittenSubmission[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ScanLine className="size-4" aria-hidden />
        No scans yet. Each save is kept; nothing is overwritten.
      </p>
    );
  }
  return (
    <div className="mt-5">
      <h3 className="text-sm font-medium">Your scans (audit history)</h3>
      <ul className="mt-2 flex gap-3 overflow-x-auto pb-2">
        {[...items].reverse().map((item, index) => (
          <li key={item.id} className="w-40 shrink-0 text-xs">
            <p className="text-muted-foreground">
              {index === 0 ? "Latest" : "Earlier"} · {new Date(item.createdAt).toLocaleString()}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt={`Submitted scan from ${item.createdAt}`}
              className="mt-1 h-28 w-full rounded-xl border border-border object-cover"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
