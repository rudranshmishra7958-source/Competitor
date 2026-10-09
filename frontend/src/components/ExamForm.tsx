"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type {
  Exam,
  ExamSecurityPolicy,
  ExamType,
  McqQuestion,
  Question,
  ShortAnswerQuestion,
  WebcamPolicy,
  WrittenQuestion,
} from "@exam/shared";
import { Plus, Save, Trash2, Video } from "lucide-react";
import { PolicySelect, POLICIES } from "@/components/PolicySelect";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DEFAULT_POLICY,
  DEFAULT_WEBCAM_POLICY,
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

function newShort(): ShortAnswerQuestion {
  return { id: crypto.randomUUID(), kind: "short", prompt: "", acceptedAnswers: [""], numeric: false, tolerance: 0 };
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

  const webcam = policy.webcam;
  function setWebcam(change: Partial<WebcamPolicy>) {
    setPolicy((current) => ({
      ...current,
      webcam: { ...DEFAULT_WEBCAM_POLICY, ...current.webcam, ...change },
    }));
  }

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

  const field =
    "mt-1.5 w-full min-h-11 rounded-xl border border-[var(--border)] px-3.5 py-2 text-sm disabled:opacity-70";

  return (
    <form className="space-y-6 pb-24" onSubmit={onSubmit}>
      {error ? (
        <p className="rounded-xl bg-[var(--risk-high-bg)] px-3 py-2 text-sm text-[var(--risk-high-fg)]" role="alert">
          {error}
        </p>
      ) : null}

      <Card as="section" className="space-y-4 sm:p-6">
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
      </Card>

      <Card as="section" className="space-y-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Questions</h2>
          {!locked ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => setQuestions((q) => [...q, newMcq()])}>
                <Plus className="size-4" aria-hidden />
                Add MCQ
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setQuestions((q) => [...q, newWritten()])}>
                <Plus className="size-4" aria-hidden />
                Add written
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setQuestions((q) => [...q, newShort()])}>
                <Plus className="size-4" aria-hidden />
                Add short answer
              </Button>
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
            <article key={q.id} className="rounded-2xl border border-[var(--border)] bg-[var(--nav-active-bg)]/30 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  {index + 1}.
                  <Badge tone="accent">
                    {q.kind === "mcq" ? "MCQ" : q.kind === "short" ? "Short answer" : "Written"}
                  </Badge>
                </span>
                {!locked ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove question ${index + 1}`}
                    onClick={() => setQuestions((list) => list.filter((x) => x.id !== q.id))}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    Remove
                  </Button>
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
                    <Button
                      variant="ghost"
                      size="sm"
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
                      <Plus className="size-4" aria-hidden />
                      Add option
                    </Button>
                  ) : null}
                </ul>
              ) : q.kind === "short" ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                  <label className="block text-sm">
                    Accepted answers (comma-separated)
                    <input
                      className={field}
                      disabled={locked}
                      value={q.acceptedAnswers.join(", ")}
                      placeholder="e.g. atomicity"
                      onChange={(e) => {
                        const acceptedAnswers = e.target.value.split(",").map((v) => v.trim());
                        setQuestions((list) =>
                          list.map((x) => (x.id === q.id && x.kind === "short" ? { ...x, acceptedAnswers } : x)),
                        );
                      }}
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={Boolean(q.numeric)}
                      onChange={(e) => {
                        const numeric = e.target.checked;
                        setQuestions((list) =>
                          list.map((x) => (x.id === q.id && x.kind === "short" ? { ...x, numeric } : x)),
                        );
                      }}
                    />
                    Numeric
                  </label>
                  {q.numeric ? (
                    <label className="block text-sm">
                      Tolerance
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={`${field} w-28`}
                        disabled={locked}
                        value={q.tolerance ?? 0}
                        onChange={(e) => {
                          const tolerance = Number(e.target.value) || 0;
                          setQuestions((list) =>
                            list.map((x) => (x.id === q.id && x.kind === "short" ? { ...x, tolerance } : x)),
                          );
                        }}
                      />
                    </label>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Photo submission in Phase 4. OCR text stays empty (`ocrText: null`).
                </p>
              )}
            </article>
          ))
        )}
      </Card>

      <Card as="section" className="space-y-4 sm:p-6">
        <h2 className="text-lg font-semibold">Security policy</h2>
        <p className="text-sm text-[var(--muted)]">
          Signals are always captured later; this only decides whether they count.
        </p>
        <table className="w-full text-left text-sm">
          <tbody>
            {POLICIES.map((row) => (
              <tr key={row.key} className="border-t border-[var(--border)]">
                <th scope="row" className="py-3 pr-3 font-medium">{row.label}</th>
                <td className="py-3 text-right">
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
      </Card>

      <Card as="section" className="space-y-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Video className="size-5 text-[var(--nav-active-fg)]" aria-hidden />
              Webcam proctoring
            </h2>
            <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
              Special permission for this exam only. Students consent, frame face to desk, and keep the
              camera on. Analysis runs on their device; only still snapshots are kept, never video.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              disabled={locked}
              checked={Boolean(webcam?.required)}
              onChange={(e) =>
                setPolicy(
                  e.target.checked
                    ? {
                        ...policy,
                        webcam: { ...DEFAULT_WEBCAM_POLICY },
                        cameraPresence: policy.cameraPresence ?? "enforce",
                        cameraPeople: policy.cameraPeople ?? "enforce",
                        cameraDevice: policy.cameraDevice ?? "enforce",
                      }
                    : { ...policy, webcam: undefined },
                )
              }
            />
            Require webcam
          </label>
        </div>
        {webcam?.required ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                Away threshold (seconds without a visible face)
                <input
                  type="number"
                  min={3}
                  max={60}
                  className={field}
                  disabled={locked}
                  value={webcam.awaySeconds}
                  onChange={(e) => setWebcam({ awaySeconds: Math.max(3, Number(e.target.value) || 5) })}
                />
              </label>
              <label className="block text-sm">
                Routine snapshot every (seconds)
                <input
                  type="number"
                  min={15}
                  max={600}
                  className={field}
                  disabled={locked}
                  value={webcam.periodicSnapshotSeconds}
                  onChange={(e) =>
                    setWebcam({ periodicSnapshotSeconds: Math.max(15, Number(e.target.value) || 60) })
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={webcam.detectSecondPerson}
                  onChange={(e) => setWebcam({ detectSecondPerson: e.target.checked })}
                />
                Detect a second person
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={webcam.detectDevices}
                  onChange={(e) => setWebcam({ detectDevices: e.target.checked })}
                />
                Detect phones and second devices
              </label>
            </div>
            <table className="w-full text-left text-sm">
              <tbody>
                {(
                  [
                    ["cameraPresence", "Leaving the seat / covered camera"],
                    ["cameraPeople", "Another person in view"],
                    ["cameraDevice", "Phone or device in view"],
                  ] as const
                ).map(([key, label]) => (
                  <tr key={key} className="border-t border-[var(--border)]">
                    <th scope="row" className="py-3 pr-3 font-medium">{label}</th>
                    <td className="py-3 text-right">
                      <PolicySelect
                        value={policy[key] ?? "enforce"}
                        disabled={locked}
                        onChange={(v) => setPolicy({ ...policy, [key]: v })}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </Card>

      <div className="glass-strong fixed inset-x-0 bottom-0 z-30 flex justify-end gap-3 rounded-none border-x-0 border-b-0 px-4 py-3 sm:px-6">
        <ButtonLink href="/admin/exams" variant="secondary">
          Back to list
        </ButtonLink>
        {!locked ? (
          <Button type="submit">
            <Save className="size-4" aria-hidden />
            Save exam
          </Button>
        ) : null}
      </div>
    </form>
  );
}
