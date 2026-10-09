"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type {
  Exam,
  ExamSecurityPolicy,
  ExamType,
  McqQuestion,
  Question,
  WrittenQuestion,
} from "@exam/shared";
import { PolicySelect, POLICIES } from "@/components/PolicySelect";
import {
  DEFAULT_POLICY,
  canEditExam,
  studentRoster,
  upsertExam,
} from "@/lib/exam-store";

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function newMcq(): McqQuestion {
  const id = crypto.randomUUID();
  const o1 = crypto.randomUUID();
  const o2 = crypto.randomUUID();
  return {
    id,
    kind: "mcq",
    prompt: "",
    options: [
      { id: o1, text: "" },
      { id: o2, text: "" },
    ],
    correctOptionId: o1,
  };
}

function newWritten(): WrittenQuestion {
  return {
    id: crypto.randomUUID(),
    kind: "written",
    prompt: "",
    attachmentUrl: null,
    ocrText: null,
  };
}

export function ExamForm({
  initial,
  initialQuestions,
  readOnly,
}: {
  initial?: Exam;
  initialQuestions?: Question[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const locked = readOnly || (initial ? !canEditExam(initial) : false);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<ExamType>(initial?.type ?? "mcq");
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt ?? ""));
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? 60);
  const [assigned, setAssigned] = useState<string[]>(initial?.assignedStudentIds ?? []);
  const [policy, setPolicy] = useState<ExamSecurityPolicy>(
    initial?.policy ?? { ...DEFAULT_POLICY },
  );
  const [questions, setQuestions] = useState<Question[]>(initialQuestions ?? []);
  const [error, setError] = useState<string | null>(null);

  function toggleStudent(id: string) {
    setAssigned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (locked) return;
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    const exam: Exam = {
      id: initial?.id ?? crypto.randomUUID(),
      title: title.trim(),
      type,
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      durationMinutes: Number(durationMinutes) || 60,
      assignedStudentIds: assigned,
      policy,
      questionIds: questions.map((q) => q.id),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    upsertExam(exam, questions);
    router.push("/admin/exams");
    router.refresh();
  }

  const field = "mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm";

  return (
    <form className="space-y-8" onSubmit={onSubmit}>
      {error ? (
        <p className="text-sm text-[var(--risk-high-fg)]" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold">Schedule</h2>
        <label className="block text-sm">
          Title
          <input className={field} value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm">
          Type
          <select className={field} value={type} disabled={locked} onChange={(e) => setType(e.target.value as ExamType)}>
            <option value="mcq">MCQ</option>
            <option value="written">Written</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
        <label className="block text-sm">
          Start
          <input
            type="datetime-local"
            className={field}
            value={startsAt}
            disabled={locked}
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Duration (minutes)
          <input
            type="number"
            min={1}
            className={field}
            value={durationMinutes}
            disabled={locked}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Assigned students</legend>
          <div className="mt-2 space-y-1">
            {studentRoster().map((s) => (
              <label key={s.userId} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={assigned.includes(s.userId)}
                  onChange={() => toggleStudent(s.userId)}
                />
                {s.displayName} ({s.institutionalId})
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Questions</h2>
          {!locked ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                onClick={() => setQuestions((q) => [...q, newMcq()])}
              >
                Add MCQ
              </button>
              <button
                type="button"
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm"
                onClick={() => setQuestions((q) => [...q, newWritten()])}
              >
                Add written
              </button>
            </div>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={locked}
            checked={policy.randomizeQuestionOrder}
            onChange={(e) => setPolicy({ ...policy, randomizeQuestionOrder: e.target.checked })}
          />
          Randomize question order per student
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={locked}
            checked={policy.randomizeOptionOrder}
            onChange={(e) => setPolicy({ ...policy, randomizeOptionOrder: e.target.checked })}
          />
          Randomize option order per student
        </label>
        {questions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No questions yet.</p>
        ) : (
          questions.map((q, index) => (
            <article key={q.id} className="rounded-md border border-[var(--border)] p-4">
              <div className="mb-2 flex justify-between text-sm text-[var(--muted)]">
                <span>
                  {index + 1}. {q.kind === "mcq" ? "MCQ" : "Written"}
                </span>
                {!locked ? (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setQuestions((list) => list.filter((x) => x.id !== q.id))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <textarea
                className={field}
                rows={2}
                disabled={locked}
                placeholder="Prompt"
                value={q.prompt}
                onChange={(e) => {
                  const prompt = e.target.value;
                  setQuestions((list) => list.map((x) => (x.id === q.id ? { ...x, prompt } : x)));
                }}
              />
              {q.kind === "mcq" ? (
                <ul className="mt-3 space-y-2">
                  {q.options.map((opt) => (
                    <li key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`correct-${q.id}`}
                        disabled={locked}
                        checked={q.correctOptionId === opt.id}
                        onChange={() =>
                          setQuestions((list) =>
                            list.map((x) =>
                              x.id === q.id && x.kind === "mcq"
                                ? { ...x, correctOptionId: opt.id }
                                : x,
                            ),
                          )
                        }
                      />
                      <input
                        className={field + " mt-0"}
                        disabled={locked}
                        value={opt.text}
                        placeholder="Option"
                        onChange={(e) => {
                          const text = e.target.value;
                          setQuestions((list) =>
                            list.map((x) => {
                              if (x.id !== q.id || x.kind !== "mcq") return x;
                              return {
                                ...x,
                                options: x.options.map((o) => (o.id === opt.id ? { ...o, text } : o)),
                              };
                            }),
                          );
                        }}
                      />
                    </li>
                  ))}
                  {!locked && q.options.length < 4 ? (
                    <button
                      type="button"
                      className="text-sm text-[var(--accent)] underline"
                      onClick={() =>
                        setQuestions((list) =>
                          list.map((x) =>
                            x.id === q.id && x.kind === "mcq"
                              ? {
                                  ...x,
                                  options: [...x.options, { id: crypto.randomUUID(), text: "" }],
                                }
                              : x,
                          ),
                        )
                      }
                    >
                      Add option
                    </button>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Photo submission in Phase 4. OCR text stays empty (`ocrText: null`).
                </p>
              )}
            </article>
          ))
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold">Security policy</h2>
        <p className="text-sm text-[var(--muted)]">
          Signals are always captured later; this only decides whether they count.
        </p>
        <table className="w-full text-left text-sm">
          <tbody>
            {POLICIES.map((row) => (
              <tr key={row.key} className="border-t border-[var(--border)]">
                <th className="py-2 font-medium">{row.label}</th>
                <td className="py-2">
                  <PolicySelect
                    value={policy[row.key]}
                    disabled={locked}
                    onChange={(v) => setPolicy({ ...policy, [row.key]: v })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={locked}
            checked={policy.cameraOptional}
            onChange={(e) => setPolicy({ ...policy, cameraOptional: e.target.checked })}
          />
          Camera optional (product default)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={locked}
            checked={policy.requireEndpointAgent}
            onChange={(e) => setPolicy({ ...policy, requireEndpointAgent: e.target.checked })}
          />
          Require endpoint agent (hard block if missing)
        </label>
      </section>

      <div className="flex gap-3">
        {!locked ? (
          <button
            type="submit"
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
          >
            Save exam
          </button>
        ) : null}
        <Link href="/admin/exams" className="rounded-md border border-[var(--border)] px-4 py-2 text-sm">
          Back to list
        </Link>
      </div>
    </form>
  );
}
