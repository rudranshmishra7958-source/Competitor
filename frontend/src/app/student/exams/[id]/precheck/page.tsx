"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, Maximize, PlayCircle, ShieldCheck, Server, EyeOff, Video } from "lucide-react";
import { FramingCheck } from "@/components/proctor/FramingCheck";
import type { Exam } from "@exam/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { examStatus, getAttempt, getExam, isAssigned, questionsForExam, startAttempt } from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import { registerExamSession, uploadSnapshot } from "@/lib/api";

export default function PrecheckPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [ua, setUa] = useState("");
  const [fullscreenOk, setFullscreenOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [framed, setFramed] = useState(false);
  const [reference, setReference] = useState<Blob | null>(null);

  useEffect(() => {
    const found = getExam(params.id) ?? null;
    setExam(found);
    setReady(true);
    setUa(navigator.userAgent);
    const s = readClientSession();
    if (found && s && !isAssigned(found, s.userId)) {
      router.replace("/student/upcoming");
    }
  }, [params.id, router]);

  if (!ready) {
    return <Skeleton className="h-64" />;
  }

  if (!exam) {
    return <p className="glass rounded-2xl p-6 text-sm text-[var(--muted)]">Exam not found.</p>;
  }

  const mcqCount = questionsForExam(exam).filter((q) => q.kind === "mcq").length;
  const shortCount = questionsForExam(exam).filter((q) => q.kind === "short").length;
  const writtenCount = questionsForExam(exam).filter((q) => q.kind === "written").length;

  async function requestFullscreen() {
    const currentExam = exam;
    if (!currentExam) return;
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenOk(true);
    } catch {
      setFullscreenOk(false);
      if (currentExam.policy.fullscreen === "enforce") {
        setError("Fullscreen was blocked. You can still continue; this will be logged.");
      }
    }
  }

  const webcam = exam.policy.webcam?.required ? exam.policy.webcam : null;
  const cameraReady = !webcam || (consent && framed);

  async function start() {
    const currentExam = exam;
    if (!currentExam) return;
    if (!cameraReady) {
      setError("Complete the camera check before starting.");
      return;
    }
    const session = readClientSession();
    if (!session) {
      router.push("/login/student");
      return;
    }
    if (examStatus(currentExam) !== "live") {
      setError("This exam is not open yet.");
      return;
    }
    if (!isAssigned(currentExam, session.userId)) {
      setError("This exam is not assigned to your account.");
      return;
    }
    const existing = getAttempt(currentExam.id, session.userId);
    if (existing?.submittedAt) {
      const hasWritten = questionsForExam(currentExam).some((q) => q.kind === "written");
      router.push(
        hasWritten && examStatus(currentExam) === "live"
          ? `/student/exams/${currentExam.id}/written`
          : `/student/exams/${currentExam.id}/submitted`,
      );
      return;
    }
    const attempt = startAttempt(currentExam, session.userId);
    const registered = await registerExamSession({
      sessionId: attempt.id,
      examId: currentExam.id,
      studentId: session.userId,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      policy: currentExam.policy,
    });
    if (!registered) {
      setError("Server registration is unavailable. Continuing in local, lower-assurance mode.");
    } else if (webcam && reference) {
      await uploadSnapshot(attempt.id, reference, "reference");
    }
    if (mcqCount + shortCount === 0) {
      router.push(`/student/exams/${currentExam.id}/written`);
      return;
    }
    router.push(`/student/exams/${currentExam.id}/take`);
  }

  const checks = [
    {
      title: "What is recorded",
      Icon: Eye,
      body: webcam
        ? "Tab leave, focus, fullscreen, clipboard actions (not the text), and a DevTools signal. Your faculty enabled webcam proctoring: the camera is analysed on this device and still snapshots are kept."
        : "Tab leave, focus, fullscreen, clipboard actions (not the text), and a DevTools signal. If you connect the agent: program name, display count, and network state.",
    },
    {
      title: "What is refused",
      Icon: EyeOff,
      body: webcam
        ? "No video recording, no audio, keystrokes, window titles, URLs, or files. The camera turns off when you submit."
        : "No face, voice, keystrokes, window titles, URLs, screenshots, or files. A second phone is out of scope.",
    },
    {
      title: "Server session",
      Icon: Server,
      body: "Start registers this attempt on the API so the proctor can see events. If the API is down, the exam still opens in lower-assurance mode.",
    },
  ];

  return (
    <div className="exam-room rise rounded-3xl p-5 sm:p-8">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--nav-active-fg)]">
        <ShieldCheck className="size-4" aria-hidden />
        Before you start
      </p>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{exam.title}</h1>
      <p className="mt-3 max-w-2xl text-[var(--muted)]">
        {mcqCount} multiple-choice {mcqCount === 1 ? "question" : "questions"}
        {shortCount ? `, ${shortCount} short answer${shortCount === 1 ? "" : "s"}` : ""}
        {writtenCount ? ` and ${writtenCount} written prompt${writtenCount === 1 ? "" : "s"}` : ""}.
        The score is evidence for a person, not an automatic fail.
      </p>
      <ul className="mt-6 grid gap-3">
        {checks.map(({ title, body, Icon }) => (
          <Card as="li" key={title} className="flex gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]">
              <Icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
            </div>
          </Card>
        ))}
        {webcam ? (
          <Card as="li" className="flex flex-col gap-4">
            <div className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]">
                <Video className="size-5" aria-hidden />
              </span>
              <div className="text-sm">
                <p className="font-semibold">Webcam proctoring is required for this exam</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[var(--muted)]">
                  <li>Your camera stays on and you see your own preview in the top-right corner.</li>
                  <li>
                    It checks on this device for: leaving your seat for more than {webcam.awaySeconds}{" "}
                    seconds{webcam.detectSecondPerson ? ", another person" : ""}
                    {webcam.detectDevices ? ", a phone or second device" : ""}, and a covered camera.
                  </li>
                  <li>
                    You will see a message each time something is flagged. Snapshots are kept every{" "}
                    {webcam.periodicSnapshotSeconds} s and at each flag. No video is recorded.
                  </li>
                  <li>Snapshots are viewed only by faculty reviewers and deleted after the retention period.</li>
                </ul>
                <label className="mt-3 flex items-start gap-2 font-medium">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  I understand and agree to webcam proctoring for this exam.
                </label>
              </div>
            </div>
            {consent ? (
              <FramingCheck
                onReady={(blob) => {
                  setReference(blob);
                  setFramed(true);
                }}
              />
            ) : null}
          </Card>
        ) : null}
        <Card as="li" className="flex gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]">
            <Maximize className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Fullscreen</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Policy: {exam.policy.fullscreen.replace(/_/g, " ")}.{" "}
              {fullscreenOk ? "Fullscreen is on." : "Fullscreen is off."}
            </p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={requestFullscreen}>
              Enter fullscreen
            </Button>
            <p className="mt-3 break-all text-xs text-[var(--muted)]">{ua || "Checking browser…"}</p>
          </div>
        </Card>
      </ul>
      {error ? (
        <p
          className="mt-4 rounded-xl bg-[var(--risk-high-bg)] px-3 py-2 text-sm text-[var(--risk-high-fg)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button size="lg" className="mt-6 w-full sm:w-auto" onClick={start} disabled={!cameraReady}>
        <PlayCircle className="size-5" aria-hidden />
        Start exam
      </Button>
    </div>
  );
}
