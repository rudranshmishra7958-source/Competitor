"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FramingCheck } from "@/components/proctor/FramingCheck";
import type { Exam } from "@exam/shared";
import { Button } from "@/components/ui/Button";
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
    return <p className="surface rounded-2xl p-6 text-sm text-muted-foreground">Exam not found.</p>;
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

  const questionSummary = [
    `${mcqCount} multiple-choice`,
    shortCount ? `${shortCount} short-answer` : null,
    writtenCount ? `${writtenCount} written` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const facts = [
    {
      title: "What is recorded",
      body: webcam
        ? "Tab leaves, focus and fullscreen changes, clipboard actions (never the text), and a developer-tools signal. Because your faculty enabled webcam proctoring, your camera is also analysed on this device and still snapshots are kept."
        : "Tab leaves, focus and fullscreen changes, clipboard actions (never the text), and a developer-tools signal. If you connect the agent: program name, display count and network state.",
    },
    {
      title: "What is never collected",
      body: webcam
        ? "Video or audio recordings, keystrokes, window titles, URLs or files. The camera turns off when you submit."
        : "Your face, voice, keystrokes, window titles, URLs, screenshots or files. A second phone is out of scope.",
    },
    {
      title: "How the proctor sees it",
      body: "Starting registers this attempt on the server so events reach your proctor. If the server is unavailable the exam still opens, with lower assurance.",
    },
  ];

  return (
    <div className="rise">
      <p className="text-sm text-muted-foreground">Before you start</p>
      <h1 className="mt-2 max-w-3xl text-4xl leading-[1.08] tracking-[-0.04em] sm:text-5xl">{exam.title}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        {questionSummary} · {exam.durationMinutes} minutes. The integrity score is evidence for a person to review, not an
        automatic fail.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-10">
          <dl className="divide-y divide-border border-y border-border">
            {facts.map((fact) => (
              <div key={fact.title} className="grid gap-1 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
                <dt className="font-medium">{fact.title}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{fact.body}</dd>
              </div>
            ))}
            <div className="grid gap-3 py-5 sm:grid-cols-[13rem_1fr] sm:gap-6">
              <dt className="font-medium">Fullscreen</dt>
              <dd className="text-sm text-muted-foreground">
                <p>
                  Policy: {exam.policy.fullscreen.replace(/_/g, " ")}. {fullscreenOk ? "Fullscreen is on." : "Fullscreen is off."}
                </p>
                <Button variant="secondary" size="sm" className="mt-3" onClick={requestFullscreen}>
                  Enter fullscreen
                </Button>
                <p className="mt-3 break-all text-xs">{ua || "Checking browser…"}</p>
              </dd>
            </div>
          </dl>

          {webcam ? (
            <section aria-labelledby="webcam-title">
              <h2 id="webcam-title" className="text-2xl tracking-[-0.03em]">
                Webcam proctoring
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Your camera stays on, and you see your own preview in the top-right corner.</li>
                <li>
                  It checks for leaving your seat for more than {webcam.awaySeconds} seconds
                  {webcam.detectSecondPerson ? ", another person" : ""}
                  {webcam.detectDevices ? ", a phone or second device" : ""}, and a covered camera.
                </li>
                <li>
                  You will see a message each time something is flagged. Snapshots are kept every{" "}
                  {webcam.periodicSnapshotSeconds} seconds and at each flag. No video is recorded.
                </li>
                <li>Only faculty reviewers see snapshots, and they are deleted after the retention period.</li>
              </ul>
              <label className="mt-5 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>I understand and agree to webcam proctoring for this exam.</span>
              </label>
              {consent ? (
                <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                  <FramingCheck
                    onReady={(blob) => {
                      setReference(blob);
                      setFramed(true);
                    }}
                  />
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Ready</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Time allowed</span>
                <span className="tabular-nums">{exam.durationMinutes} min</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Questions</span>
                <span className="tabular-nums">{mcqCount + shortCount + writtenCount}</span>
              </li>
              {webcam ? (
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground">Camera check</span>
                  <span className={framed ? "text-[var(--sage-ink)]" : ""}>{framed ? "Done" : consent ? "In progress" : "Needs consent"}</span>
                </li>
              ) : null}
            </ul>
            {error ? (
              <p className="mt-4 rounded-xl bg-[var(--risk-high-bg)] px-3 py-2 text-sm text-[var(--risk-high-fg)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button size="lg" className="mt-5 w-full" onClick={start} disabled={!cameraReady}>
              Start exam
            </Button>
            {!cameraReady ? (
              <p className="mt-3 text-xs text-muted-foreground">Complete the camera check to enable Start.</p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
