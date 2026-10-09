"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Exam } from "@exam/shared";
import { examStatus, getAttempt, getExam, isAssigned, questionsForExam, startAttempt } from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import { registerExamSession } from "@/lib/api";

export default function PrecheckPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [ua, setUa] = useState("");
  const [fullscreenOk, setFullscreenOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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
    return <p className="text-sm text-[var(--muted)]">Loading exam…</p>;
  }

  if (!exam) {
    return <p className="text-sm text-[var(--muted)]">Exam not found.</p>;
  }

  const mcqCount = questionsForExam(exam).filter((q) => q.kind === "mcq").length;
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

  async function start() {
    const currentExam = exam;
    if (!currentExam) return;
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
    }
    if (mcqCount === 0) {
      router.push(`/student/exams/${currentExam.id}/written`);
      return;
    }
    router.push(`/student/exams/${currentExam.id}/take`);
  }

  const checks = [
    {
      title: "What is recorded",
      body: "Tab leave, focus, fullscreen, clipboard actions (not the text), and a DevTools signal. If you connect the agent: program name, display count, and network state.",
    },
    {
      title: "What is refused",
      body: "No face, voice, keystrokes, window titles, URLs, screenshots, or files. A second phone is out of scope.",
    },
    {
      title: "Server session",
      body: "Start registers this attempt on the API so the proctor can see events. If the API is down, the exam still opens in lower-assurance mode.",
    },
  ];

  return (
    <div className="rounded-2xl bg-[var(--exam-bg)] px-6 py-6 text-[#e8eaed]">
      <p className="text-xs font-semibold tracking-wide text-[var(--cyan)]">BEFORE YOU START</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">{exam.title}</h1>
      <p className="mt-2 max-w-2xl text-[var(--text-muted)]">
        {mcqCount} multiple-choice {mcqCount === 1 ? "question" : "questions"}
        {writtenCount ? ` and ${writtenCount} written prompt${writtenCount === 1 ? "" : "s"}` : ""}.
        The score is evidence for a person, not an automatic fail.
      </p>
      <ul className="mt-6 space-y-3">
        {checks.map((item) => (
          <li key={item.title} className="rounded-xl border border-white/10 bg-[var(--panel)] p-4">
            <p className="font-semibold text-[var(--lime)]">{item.title}</p>
            <p className="mt-1 text-base leading-relaxed">{item.body}</p>
          </li>
        ))}
        <li className="rounded-xl border border-white/10 bg-[var(--panel)] p-4">
          <p className="font-semibold text-[var(--lime)]">Fullscreen</p>
          <p className="mt-1 text-base">
            Policy: {exam.policy.fullscreen.replace(/_/g, " ")}. {fullscreenOk ? "Fullscreen is on." : "Fullscreen is off."}
          </p>
          <button
            type="button"
            className="mt-3 rounded-md border border-[var(--cyan)] px-3 py-1.5 text-[var(--cyan)]"
            onClick={requestFullscreen}
          >
            Enter fullscreen
          </button>
          <p className="mt-3 break-all text-xs text-[var(--text-muted)]">{ua || "Checking browser…"}</p>
        </li>
      </ul>
      {error ? (
        <p className="mt-4 text-sm text-[#ffb4b4]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-6 rounded-md bg-[var(--cyan)] px-5 py-2.5 text-base font-semibold text-[var(--exam-bg)]"
        onClick={start}
      >
        Start exam
      </button>
    </div>
  );
}
