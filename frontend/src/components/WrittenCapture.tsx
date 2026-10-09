"use client";

import { useRef, useState } from "react";
import type { WrittenQuestion, WrittenSubmission } from "@exam/shared";
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

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-medium">{question.prompt}</p>
      {!disabled ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
            Upload scan
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          <label className="cursor-pointer rounded-md border border-[var(--border)] px-3 py-1.5 text-sm">
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
          <button
            type="button"
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
            disabled={busy}
            onClick={() => void startCamera()}
          >
            Open camera
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">This exam window is closed. History below is still visible.</p>
      )}
      {cameraOn ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-[var(--muted)]">
            This camera is only for photographing your written answer — not live proctoring.
          </p>
          <video ref={attachVideo} autoPlay playsInline muted className="max-h-64 w-full rounded-md bg-black" />
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
              onClick={snapPhoto}
            >
              Capture
            </button>
            <button type="button" className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm" onClick={stopCamera}>
              Close camera
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-[var(--risk-high-fg)]" role="alert">
          {error}
        </p>
      ) : null}
      {preview ? (
        <div className="mt-4 space-y-2">
          <img src={preview} alt="Preview of written answer" className="max-h-64 rounded-md border border-[var(--border)]" />
          {warnings.length ? (
            <ul className="text-sm text-[var(--risk-medium-fg)]">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">Looks readable.</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm text-white"
              onClick={submitPreview}
            >
              {warnings.length ? "Save anyway" : "Save this scan"}
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
              onClick={() => {
                setPreview(null);
                setWarnings([]);
              }}
            >
              Retake
            </button>
          </div>
        </div>
      ) : null}
      <HistoryList items={history} />
    </article>
  );
}

function HistoryList({ items }: { items: WrittenSubmission[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--muted)]">
        No scans yet. Each save is kept; nothing is overwritten.
      </p>
    );
  }
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium">Your scans (audit history)</h3>
      <ul className="mt-2 space-y-3">
        {[...items].reverse().map((item, index) => (
          <li key={item.id} className="text-sm">
            <p className="text-[var(--muted)]">
              {index === 0 ? "Latest" : "Earlier"} · {new Date(item.createdAt).toLocaleString()}
            </p>
            <img
              src={item.imageUrl}
              alt={`Submitted scan from ${item.createdAt}`}
              className="mt-1 max-h-40 rounded-md border border-[var(--border)]"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
