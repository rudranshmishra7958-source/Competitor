"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Flag, Radio, Timer } from "lucide-react";
import type { Attempt, AutoGradedQuestion, Exam } from "@exam/shared";
import { BrowserMonitor } from "@/components/BrowserMonitor";
import { AgentSetup } from "@/components/AgentSetup";
import { IntegrityViolationAlert } from "@/components/IntegrityViolationAlert";
import { ProctorCamera, type CameraStatus } from "@/components/proctor/ProctorCamera";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  answersForAttempt,
  examStatus,
  getAttempt,
  getExam,
  isAssigned,
  questionsForExam,
  saveAnswer,
  saveTextAnswer,
  seededShuffle,
  startAttempt,
  submitAttempt,
} from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import { markSessionSubmitted } from "@/lib/api";
import { useSessionIntegrityAlerts } from "@/lib/use-session-integrity-alerts";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TakeExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<AutoGradedQuestion[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [remainingMs, setRemainingMs] = useState(0);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [agentReady, setAgentReady] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("starting");
  const [eventCount, setEventCount] = useState(0);
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const autoSubmitted = useRef(false);
  const integrity = useSessionIntegrityAlerts(attempt?.id ?? null);
  const agentConnected = integrity.endpointConnected;

  const finish = useCallback(
    (attemptId: string) => {
      submitAttempt(attemptId);
      const found = getExam(params.id);
      const hasWritten = found
        ? questionsForExam(found).some((q) => q.kind === "written")
        : false;
      if (!hasWritten) void markSessionSubmitted(attemptId);
      router.push(
        hasWritten ? `/student/exams/${params.id}/written` : `/student/exams/${params.id}/submitted`,
      );
    },
    [params.id, router],
  );

  useEffect(() => {
    const session = readClientSession();
    const found = getExam(params.id);
    if (!session || !found || !isAssigned(found, session.userId)) {
      router.replace("/student/upcoming");
      return;
    }
    if (examStatus(found) !== "live" && !getAttempt(found.id, session.userId)) {
      router.push("/student/upcoming");
      return;
    }
    let current = getAttempt(found.id, session.userId);
    if (!current) current = startAttempt(found, session.userId);
    if (current.submittedAt) {
      const hasWritten = questionsForExam(found).some((q) => q.kind === "written");
      router.push(
        hasWritten ? `/student/exams/${found.id}/written` : `/student/exams/${found.id}/submitted`,
      );
      return;
    }
    setExam(found);
    setAttempt(current);
    setStudentId(session.userId);
    setAgentReady(!found.policy.requireEndpointAgent);
    const onPage = questionsForExam(found).filter(
      (q): q is AutoGradedQuestion => q.kind === "mcq" || q.kind === "short",
    );
    const seed = `${found.id}:${session.userId}`;
    const ordered = found.policy.randomizeQuestionOrder ? seededShuffle(onPage, seed) : onPage;
    const withOpts = ordered.map((q) =>
      q.kind === "mcq" && found.policy.randomizeOptionOrder
        ? { ...q, options: seededShuffle(q.options, `${seed}:${q.id}`) }
        : q,
    );
    setQuestions(withOpts);
    const saved: Record<string, string> = {};
    for (const a of answersForAttempt(current.id)) saved[a.questionId] = a.text ?? a.selectedOptionId;
    setSelected(saved);
  }, [params.id, router]);

  useEffect(() => {
    if (!exam) return;
    const required = Boolean(exam.policy.requireEndpointAgent);
    setAgentReady(!required || agentConnected);
  }, [exam, agentConnected]);

  useEffect(() => {
    if (!attempt) return;
    const tick = () => {
      const left = Date.parse(attempt.expiresAt) - Date.now();
      setRemainingMs(left);
      if (left <= 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        finish(attempt.id);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [attempt, finish]);

  const writtenNote = useMemo(() => {
    if (!exam) return false;
    return questionsForExam(exam).some((q) => q.kind === "written");
  }, [exam]);

  if (!exam || !attempt) {
    return <Skeleton className="h-64" />;
  }

  function pick(questionId: string, optionId: string) {
    if (!attempt) return;
    setSelected((prev) => ({ ...prev, [questionId]: optionId }));
    saveAnswer(attempt.id, questionId, optionId);
  }

  function typeAnswer(questionId: string, text: string) {
    if (!attempt) return;
    setSelected((prev) => ({ ...prev, [questionId]: text }));
    saveTextAnswer(attempt.id, questionId, text);
  }

  const canAnswer = agentReady && (!exam.policy.webcam?.required || cameraStatus === "live");
  const answered = questions.filter((q) => selected[q.id]?.trim()).length;
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const lowTime = remainingMs > 0 && remainingMs < 5 * 60 * 1000;
  const unanswered = questions.length - answered;
  const flaggedCount = questions.filter((q) => flagged[q.id]).length;
  const webcamRequired = Boolean(exam.policy.webcam?.required);

  function toggleFlag(questionId: string) {
    setFlagged((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  }

  return (
    <div className="rise mx-auto max-w-3xl">
      {integrity.notice ? (
        <IntegrityViolationAlert notice={integrity.notice} onDismiss={integrity.dismiss} />
      ) : null}
      {studentId ? (
        <BrowserMonitor
          examId={exam.id}
          studentId={studentId}
          sessionId={attempt.id}
          policy={exam.policy}
          onCount={setEventCount}
          onViolation={integrity.reportViolation}
        />
      ) : null}
      {studentId && webcamRequired && exam.policy.webcam ? (
        <ProctorCamera
          sessionId={attempt.id}
          examId={exam.id}
          studentId={studentId}
          policy={exam.policy.webcam}
          onIncident={integrity.reportViolation}
          onStatus={setCameraStatus}
        />
      ) : null}

      {/* Slim sticky bar: what a student needs at a glance, nothing more. */}
      <div className="sticky top-16 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="truncate text-lg tracking-[-0.02em] sm:text-xl">{exam.title}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>
                {answered} of {questions.length} answered
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3" aria-hidden />
                Saved automatically
              </span>
            </p>
          </div>
          <p
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-lg tabular-nums ${
              lowTime
                ? "border-[var(--risk-high-fg)]/50 bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]"
                : "border-border bg-card"
            }`}
            aria-live="polite"
            aria-label={`Time remaining ${formatRemaining(remainingMs)}`}
          >
            <Timer className="size-4" aria-hidden />
            {formatRemaining(remainingMs)}
          </p>
        </div>
        <div
          className="mt-3 h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Answered questions"
        >
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        <nav aria-label="Question navigator" className="mt-3 flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const done = Boolean(selected[q.id]?.trim());
            return (
              <a
                key={q.id}
                href={`#q-${q.id}`}
                aria-label={`Question ${i + 1}${done ? ", answered" : ", unanswered"}${flagged[q.id] ? ", flagged" : ""}`}
                className={`relative grid size-8 place-items-center rounded-lg text-xs tabular-nums ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground"
                }`}
              >
                {i + 1}
                {flagged[q.id] ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--risk-medium-fg)]" aria-hidden />
                ) : null}
              </a>
            );
          })}
        </nav>
      </div>

      {/* Monitoring status: visible, but quiet. */}
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge tone="low" icon={<Radio aria-hidden />}>
          Monitoring on
        </Badge>
        {webcamRequired ? (
          <Badge tone={cameraStatus === "live" ? "neutral" : "medium"}>
            Camera {cameraStatus === "live" ? "on" : cameraStatus === "starting" ? "starting" : "off"}
          </Badge>
        ) : null}
        {exam.policy.requireEndpointAgent || agentConnected ? (
          <Badge tone={agentConnected ? "neutral" : "medium"}>Agent {agentConnected ? "connected" : "not connected"}</Badge>
        ) : null}
        <span>
          {eventCount} browser {eventCount === 1 ? "event" : "events"} · integrity score {integrity.score} (for review)
        </span>
      </div>

      {studentId && !agentConnected ? (
        <div className="mt-4">
          <AgentSetup
            examId={exam.id}
            studentId={studentId}
            sessionId={attempt.id}
            required={exam.policy.requireEndpointAgent}
            connected={agentConnected}
          />
        </div>
      ) : null}

      {webcamRequired && cameraStatus !== "live" ? (
        <p role="alert" className="mt-4 rounded-xl bg-[var(--risk-medium-bg)] px-4 py-3 text-sm text-[var(--risk-medium-fg)]">
          {cameraStatus === "starting"
            ? "Starting your camera. Answers unlock once it is on."
            : "This exam requires your webcam. Allow the camera in the address bar to continue; answers are locked until then."}
        </p>
      ) : null}
      {writtenNote ? (
        <p className="mt-4 text-sm text-muted-foreground">Written answers are photographed after these questions.</p>
      ) : null}

      <ol className="mt-6 space-y-5">
        {questions.map((q, i) => (
          <Card as="li" key={q.id} id={`q-${q.id}`} className="scroll-mt-52 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Question {i + 1} of {questions.length}
              </p>
              <button
                type="button"
                onClick={() => toggleFlag(q.id)}
                aria-pressed={Boolean(flagged[q.id])}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  flagged[q.id]
                    ? "border-[var(--risk-medium-fg)]/40 bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Flag className="size-3" aria-hidden />
                {flagged[q.id] ? "Flagged" : "Flag for review"}
              </button>
            </div>
            <p className="mt-2 text-[17px] leading-relaxed sm:text-lg">{q.prompt}</p>
            {q.kind === "short" ? (
              <label className="mt-5 block text-sm">
                <span className="text-muted-foreground">{q.numeric ? "Type a number" : "Type a short answer"}</span>
                <input
                  type="text"
                  inputMode={q.numeric ? "decimal" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  value={selected[q.id] ?? ""}
                  onChange={(e) => typeAnswer(q.id, e.target.value)}
                  disabled={!canAnswer}
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-border px-4 text-base"
                />
              </label>
            ) : (
              <ul className="mt-5 space-y-2.5">
                {q.options.map((opt, index) => {
                  const on = selected[q.id] === opt.id;
                  return (
                    <li key={opt.id}>
                      <label
                        className={`flex min-h-13 cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3 text-base transition-colors focus-within:ring-2 focus-within:ring-[var(--ring)] ${
                          on ? "border-foreground bg-muted" : "border-border hover:border-[var(--border-strong)] hover:bg-muted/50"
                        } ${canAnswer ? "" : "cursor-not-allowed opacity-60"}`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          className="sr-only"
                          checked={on}
                          onChange={() => pick(q.id, opt.id)}
                          disabled={!canAnswer}
                        />
                        <span
                          aria-hidden
                          className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-medium ${
                            on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm text-muted-foreground">
          {unanswered === 0 ? "All questions answered." : `${unanswered} unanswered`}
          {flaggedCount ? ` · ${flaggedCount} flagged for review` : ""}
        </p>
        <Button size="lg" onClick={() => setConfirming(true)} disabled={!canAnswer}>
          Review and submit
        </Button>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Submit this attempt?">
        <p className="text-sm text-muted-foreground">
          {answered} of {questions.length} answered
          {unanswered ? `, ${unanswered} left blank` : ""}
          {flaggedCount ? `, ${flaggedCount} still flagged` : ""}. You cannot change answers after submitting.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Keep working
          </Button>
          <Button onClick={() => finish(attempt.id)}>Submit</Button>
        </div>
      </Modal>
    </div>
  );
}
