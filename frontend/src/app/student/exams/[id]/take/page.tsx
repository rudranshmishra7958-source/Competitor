"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Attempt, Exam, McqQuestion } from "@exam/shared";
import { BrowserMonitor } from "@/components/BrowserMonitor";
import { AgentSetup } from "@/components/AgentSetup";
import { IntegrityViolationAlert } from "@/components/IntegrityViolationAlert";
import {
  answersForAttempt,
  examStatus,
  getAttempt,
  getExam,
  isAssigned,
  questionsForExam,
  saveAnswer,
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
  const [questions, setQuestions] = useState<McqQuestion[]>([]);
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
    const mcq = questionsForExam(found).filter((q): q is McqQuestion => q.kind === "mcq");
    const seed = `${found.id}:${session.userId}`;
    const ordered = found.policy.randomizeQuestionOrder ? seededShuffle(mcq, seed) : mcq;
    const withOpts = ordered.map((q) => ({
      ...q,
      options: found.policy.randomizeOptionOrder
        ? seededShuffle(q.options, `${seed}:${q.id}`)
        : q.options,
    }));
    setQuestions(withOpts);
    const saved: Record<string, string> = {};
    for (const a of answersForAttempt(current.id)) saved[a.questionId] = a.selectedOptionId;
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
    return <p className="text-sm text-[var(--muted)]">Loading exam…</p>;
  }

  function pick(questionId: string, optionId: string) {
    if (!attempt) return;
    setSelected((prev) => ({ ...prev, [questionId]: optionId }));
    saveAnswer(attempt.id, questionId, optionId);
  }

  return (
    <div className="-mx-2 rounded-2xl bg-[var(--exam-bg)] px-5 py-5 text-[#e8eaed]">
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
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[var(--lime)]">MONITOR ON</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">{exam.title}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {eventCount} browser {eventCount === 1 ? "event" : "events"} · Integrity score{" "}
            {integrity.score} (for review) ·{" "}
            {agentConnected ? "Agent connected" : exam.policy.requireEndpointAgent ? "Agent required" : "Agent optional"}
          </p>
        </div>
        <p
          className="rounded-lg border border-[var(--cyan)] px-4 py-2 font-mono text-2xl text-[var(--cyan)]"
          aria-live="polite"
        >
          {formatRemaining(remainingMs)}
        </p>
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
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          Written prompts come after these questions.
        </p>
      ) : null}
      <ol className="mt-6 space-y-4">
        {questions.map((q, i) => (
          <li key={q.id} className="rounded-xl border border-white/10 bg-[var(--panel)] p-5">
            <p className="text-lg font-medium leading-snug text-white">
              {i + 1}. {q.prompt}
            </p>
            <ul className="mt-4 space-y-2">
              {q.options.map((opt) => {
                const on = selected[q.id] === opt.id;
                return (
                  <li key={opt.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-3 text-base ${
                        on
                          ? "border-[var(--cyan)] bg-[#0b2a33] text-white"
                          : "border-white/10 text-[#e8eaed] hover:border-[var(--cyan)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        className="mt-1"
                        checked={on}
                        onChange={() => pick(q.id, opt.id)}
                        disabled={!agentReady}
                      />
                      <span>{opt.text}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
      {confirming ? (
        <div className="mt-6 rounded-xl border border-[var(--cyan)] bg-[var(--panel)] p-4">
          <p>Submit this attempt? You cannot change answers after this.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-md bg-[var(--cyan)] px-4 py-2 font-medium text-[var(--exam-bg)]"
              onClick={() => finish(attempt.id)}
            >
              Confirm submit
            </button>
            <button
              type="button"
              className="rounded-md border border-white/20 px-4 py-2"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="mt-6 rounded-md bg-[var(--cyan)] px-5 py-2.5 text-base font-semibold text-[var(--exam-bg)] disabled:opacity-50"
          onClick={() => setConfirming(true)}
          disabled={!agentReady}
        >
          Submit
        </button>
      )}
    </div>
  );
}
