"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Attempt, Exam, WrittenQuestion } from "@exam/shared";
import { WrittenCapture } from "@/components/WrittenCapture";
import { BrowserMonitor } from "@/components/BrowserMonitor";
import { AgentSetup } from "@/components/AgentSetup";
import { IntegrityViolationAlert } from "@/components/IntegrityViolationAlert";
import {
  examStatus,
  getAttempt,
  getExam,
  isAssigned,
  questionsForExam,
  startAttempt,
  submitAttempt,
} from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import { markSessionSubmitted } from "@/lib/api";
import { useSessionIntegrityAlerts } from "@/lib/use-session-integrity-alerts";

export default function WrittenExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<WrittenQuestion[]>([]);
  const integrity = useSessionIntegrityAlerts(attempt?.id ?? null);

  useEffect(() => {
    const session = readClientSession();
    const found = getExam(params.id);
    if (!session || !found || !isAssigned(found, session.userId)) {
      router.replace("/student/upcoming");
      return;
    }
    const mcqCount = questionsForExam(found).filter((q) => q.kind === "mcq").length;
    let current = getAttempt(found.id, session.userId);
    if (mcqCount > 0 && !current?.submittedAt) {
      router.replace(`/student/exams/${found.id}/take`);
      return;
    }
    if (examStatus(found) !== "live" && !current) {
      router.replace("/student/upcoming");
      return;
    }
    if (!current) current = startAttempt(found, session.userId);
    setExam(found);
    setAttempt(current);
    setStudentId(session.userId);
    setQuestions(questionsForExam(found).filter((q): q is WrittenQuestion => q.kind === "written"));
  }, [params.id, router]);

  if (!exam || !attempt || !studentId) {
    return <p className="text-sm text-[var(--muted)]">Loading written questions…</p>;
  }

  if (questions.length === 0) {
    return <p className="text-sm text-[var(--muted)]">This exam has no written prompts.</p>;
  }

  const remaining = Date.parse(attempt.expiresAt) - Date.now();
  const open = remaining > 0;

  return (
    <div>
      {integrity.notice ? (
        <IntegrityViolationAlert notice={integrity.notice} onDismiss={integrity.dismiss} />
      ) : null}
      <AgentSetup
        examId={exam.id}
        studentId={studentId}
        sessionId={attempt.id}
        required={exam.policy.requireEndpointAgent}
        connected={integrity.endpointConnected}
      />
      <BrowserMonitor
        examId={exam.id}
        studentId={studentId}
        sessionId={attempt.id}
        policy={exam.policy}
        onViolation={integrity.reportViolation}
      />
      <p className="mb-4 text-sm font-medium text-[var(--cyan)]">
        MONITOR ON · Integrity score {integrity.score} (for review)
      </p>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{exam.title}</h1>
        <p className="text-sm text-[var(--muted)]">Written answers</p>
      </div>
      <p className="mb-4 text-sm text-[var(--muted)]">
        Each photo is stored as a new submission. Admins see the full history, not a replacement.
      </p>
      <div className="space-y-6">
        {questions.map((q) => (
          <WrittenCapture
            key={q.id}
            examId={exam.id}
            studentId={studentId}
            sessionId={attempt.id}
            question={q}
            disabled={!open}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          submitAttempt(attempt.id);
          void markSessionSubmitted(attempt.id);
          router.push(`/student/exams/${exam.id}/submitted`);
        }}
        className="mt-6 inline-block rounded-md bg-[var(--accent)] px-4 py-2 text-sm text-white"
      >
        Done
      </button>
    </div>
  );
}
