"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCheck, Radio } from "lucide-react";
import type { Attempt, Exam, WrittenQuestion } from "@exam/shared";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WrittenCapture } from "@/components/WrittenCapture";
import { BrowserMonitor } from "@/components/BrowserMonitor";
import { AgentSetup } from "@/components/AgentSetup";
import { IntegrityViolationAlert } from "@/components/IntegrityViolationAlert";
import { ProctorCamera, type CameraStatus } from "@/components/proctor/ProctorCamera";
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
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("starting");

  useEffect(() => {
    const session = readClientSession();
    const found = getExam(params.id);
    if (!session || !found || !isAssigned(found, session.userId)) {
      router.replace("/student/upcoming");
      return;
    }
    const mcqCount = questionsForExam(found).filter((q) => q.kind === "mcq" || q.kind === "short").length;
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
    return <Skeleton className="h-64" />;
  }

  if (questions.length === 0) {
    return <p className="surface rounded-2xl p-6 text-sm text-[var(--muted)]">This exam has no written prompts.</p>;
  }

  const remaining = Date.parse(attempt.expiresAt) - Date.now();
  const open = remaining > 0;
  const cameraLocked = Boolean(exam.policy.webcam?.required) && open && cameraStatus !== "live";

  return (
    <div className="exam-room rise rounded-3xl p-4 sm:p-6">
      {integrity.notice ? (
        <IntegrityViolationAlert notice={integrity.notice} onDismiss={integrity.dismiss} />
      ) : null}
      <BrowserMonitor
        examId={exam.id}
        studentId={studentId}
        sessionId={attempt.id}
        policy={exam.policy}
        onViolation={integrity.reportViolation}
      />
      {open && exam.policy.webcam?.required ? (
        <ProctorCamera
          sessionId={attempt.id}
          examId={exam.id}
          studentId={studentId}
          policy={exam.policy.webcam}
          onIncident={integrity.reportViolation}
          onStatus={setCameraStatus}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge tone="low" icon={<Radio className="size-3.5" aria-hidden />}>
            Monitor on
          </Badge>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{exam.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Written answers · Integrity score {integrity.score} (for review)
          </p>
        </div>
      </div>
      <div className="mt-4">
        <AgentSetup
          examId={exam.id}
          studentId={studentId}
          sessionId={attempt.id}
          required={exam.policy.requireEndpointAgent}
          connected={integrity.endpointConnected}
        />
      </div>
      {cameraLocked ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-[var(--risk-medium-bg)] px-4 py-3 text-sm text-[var(--risk-medium-fg)]"
        >
          {cameraStatus === "starting"
            ? "Starting your camera. Answers unlock once it is on."
            : "This exam requires your webcam. Allow the camera in the address bar to continue; answers are locked until then."}
        </p>
      ) : null}
      <p className="mb-4 mt-4 text-sm text-[var(--muted)]">
        Each photo is stored as a new submission. Admins see the full history, not a replacement.
      </p>
      <div className="space-y-5">
        {questions.map((q) => (
          <WrittenCapture
            key={q.id}
            examId={exam.id}
            studentId={studentId}
            sessionId={attempt.id}
            question={q}
            disabled={!open || cameraLocked}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          size="lg"
          onClick={() => {
            submitAttempt(attempt.id);
            void markSessionSubmitted(attempt.id);
            router.push(`/student/exams/${exam.id}/submitted`);
          }}
        >
          <CheckCheck className="size-5" aria-hidden />
          Done
        </Button>
      </div>
    </div>
  );
}
