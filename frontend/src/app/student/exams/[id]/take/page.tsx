"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Radio, Timer } from "lucide-react";
import type { Attempt, AutoGradedQuestion, Exam } from "@exam/shared";
import { BrowserMonitor } from "@/components/BrowserMonitor";
import { AgentSetup } from "@/components/AgentSetup";
import { IntegrityViolationAlert } from "@/components/IntegrityViolationAlert";
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
  const [eventCount, setEventCount] = useState(0);
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

  const answered = questions.filter((q) => selected[q.id]?.trim()).length;
  const progress = questions.length ? Math.round((answered / questions.length) * 100) : 0;
  const lowTime = remainingMs > 0 && remainingMs < 5 * 60 * 1000;

  return (
    <div className="exam-room rise rounded-3xl p-4 sm:p-6">
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

      <div className="glass-strong z-20 sm:sticky sm:top-20 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <Badge tone="low" icon={<Radio className="size-3.5" aria-hidden />}>
              Monitor on
            </Badge>
            <h1 className="mt-2 truncate text-xl font-semibold sm:text-2xl">{exam.title}</h1>
            <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
              {eventCount} browser {eventCount === 1 ? "event" : "events"} · Integrity score{" "}
              {integrity.score} (for review) ·{" "}
              {agentConnected
                ? "Agent connected"
                : exam.policy.requireEndpointAgent
                  ? "Agent required"
                  : "Agent optional"}
            </p>
          </div>
          <p
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 font-mono text-2xl tabular-nums ${
              lowTime
                ? "border-[var(--risk-high-fg)] text-[var(--risk-high-fg)]"
                : "border-[var(--nav-active-fg)] text-[var(--nav-active-fg)]"
            }`}
            aria-live="polite"
          >
            <Timer className="size-5" aria-hidden />
            {formatRemaining(remainingMs)}
          </p>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-[var(--muted)]">
            <span>
              {answered} of {questions.length} answered
            </span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--border)]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Answered questions"
          >
            <div
              className="h-full rounded-full bg-[image:var(--accent-grad)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <nav aria-label="Question navigator" className="mt-3 flex flex-wrap gap-1.5">
            {questions.map((q, i) => (
              <a
                key={q.id}
                href={`#q-${q.id}`}
                aria-label={`Question ${i + 1}${selected[q.id]?.trim() ? ", answered" : ", unanswered"}`}
                className={`grid size-8 place-items-center rounded-lg text-xs font-medium ${
                  selected[q.id]?.trim()
                    ? "btn-grad"
                    : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]"
                }`}
              >
                {i + 1}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {studentId ? (
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
      {writtenNote ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Written prompts come after these questions.</p>
      ) : null}

      <ol className="mt-6 space-y-4">
        {questions.map((q, i) => (
          <Card as="li" key={q.id} id={`q-${q.id}`} className="scroll-mt-48 sm:p-6">
            <p className="text-lg font-medium leading-snug">
              <span className="mr-2 text-[var(--nav-active-fg)]">{i + 1}.</span>
              {q.prompt}
            </p>
            {q.kind === "short" ? (
              <label className="mt-4 block text-sm">
                <span className="text-[var(--muted)]">
                  {q.numeric ? "Type a number" : "Type a short answer"}
                </span>
                <input
                  type="text"
                  inputMode={q.numeric ? "decimal" : "text"}
                  autoComplete="off"
                  spellCheck={false}
                  value={selected[q.id] ?? ""}
                  onChange={(e) => typeAnswer(q.id, e.target.value)}
                  disabled={!agentReady}
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-[var(--border)] px-4 text-base"
                />
              </label>
            ) : (
            <ul className="mt-4 space-y-2.5">
              {q.options.map((opt) => {
                const on = selected[q.id] === opt.id;
                return (
                  <li key={opt.id}>
                    <label
                      className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-base transition-colors focus-within:ring-2 focus-within:ring-[var(--ring)] ${
                        on
                          ? "border-[var(--accent)] bg-[var(--nav-active-bg)]"
                          : "border-[var(--border)] hover:border-[var(--accent)]"
                      } ${agentReady ? "" : "cursor-not-allowed opacity-60"}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        className="mt-1 size-4"
                        checked={on}
                        onChange={() => pick(q.id, opt.id)}
                        disabled={!agentReady}
                      />
                      <span className="flex-1">{opt.text}</span>
                      {on ? (
                        <CheckCircle2 className="size-5 shrink-0 text-[var(--nav-active-fg)]" aria-hidden />
                      ) : null}
                    </label>
                  </li>
                );
              })}
            </ul>
            )}
          </Card>
        ))}
      </ol>

      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={() => setConfirming(true)} disabled={!agentReady}>
          Submit
        </Button>
      </div>

      <Modal open={confirming} onClose={() => setConfirming(false)} title="Submit this attempt?">
        <p className="text-sm text-[var(--muted)]">
          You cannot change answers after this. {answered} of {questions.length} questions answered.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
          <Button onClick={() => finish(attempt.id)}>Confirm submit</Button>
        </div>
      </Modal>
    </div>
  );
}
