"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CircleCheck,
  Clock,
  Gauge,
  Link2,
  Pause,
  Play,
  Printer,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react";
import { Wordmark } from "@/components/brand/VigilMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { clock, demoStateAt, type DemoStudentState, type PriorityLevel } from "@/lib/demo/engine";
import { SCENARIOS } from "@/lib/demo/scenarios";
import { cn, sentence } from "@/lib/utils";
import { DemoFrame } from "./DemoFrame";

type Tab = "live" | "feed" | "reports" | "setup";
type Decision = "unreviewed" | "flagged" | "cleared";

const SPEEDS = [1, 2, 4] as const;

const LEVEL_TONE: Record<PriorityLevel, "low" | "medium" | "high"> = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "high",
};

const SOURCE_LABEL = { browser: "Browser", camera: "Camera", agent: "Agent" } as const;

export function DemoConsole() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [tab, setTab] = useState<Tab>("live");
  const [openId, setOpenId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, { status: Decision; note: string }>>({});
  const [endSeen, setEndSeen] = useState(false);
  const last = useRef<number | null>(null);

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const state = useMemo(() => demoStateAt(scenario, t), [scenario, t]);

  // Simple clock: advances only while playing; nothing is random.
  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    const id = window.setInterval(() => {
      const now = performance.now();
      const delta = last.current === null ? 0 : (now - last.current) / 1000;
      last.current = now;
      setT((current) => {
        const next = Math.min(scenario.durationSec, current + delta * speed);
        if (next >= scenario.durationSec) setPlaying(false);
        return next;
      });
    }, 200);
    return () => window.clearInterval(id);
  }, [playing, speed, scenario.durationSec]);

  const restart = useCallback(() => {
    setT(0);
    setPlaying(false);
    setDecisions({});
    setOpenId(null);
    setEndSeen(false);
    setTab("live");
  }, []);

  function chooseScenario(id: string) {
    setScenarioId(id);
    restart();
  }

  const selected = state.students.find((s) => s.student.id === openId) ?? null;
  const ranked = [...state.students].sort((a, b) => b.priority.score - a.priority.score);
  const writing = state.students.filter((s) => s.status === "writing").length;
  const submitted = state.students.filter((s) => s.status === "submitted").length;
  const incidents = state.students.reduce((sum, s) => sum + s.incidents.length, 0);
  const needReview = state.students.filter((s) => s.priority.level !== "low").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Vigil home">
              <Wordmark />
            </Link>
            <Badge tone="medium">Recorded demo · fictional data</Badge>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/login/admin"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3.5 text-sm hover:bg-muted"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Exit demo
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 print:hidden">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Proctor view · replay</p>
            <h1 className="mt-1 text-3xl tracking-[-0.035em] sm:text-4xl">{scenario.exam}</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{scenario.summary}</p>
          </div>
        </div>

        <div role="radiogroup" aria-label="Demo scenario" className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SCENARIOS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={option.id === scenario.id}
              onClick={() => chooseScenario(option.id)}
              className={cn(
                "rounded-2xl border p-4 text-left",
                option.id === scenario.id
                  ? "border-foreground bg-card"
                  : "border-border text-muted-foreground hover:border-[var(--border-strong)] hover:text-foreground",
              )}
            >
              <p className="text-sm font-medium text-foreground">{option.title}</p>
              <p className="mt-1 text-xs">{option.exam}</p>
            </button>
          ))}
        </div>

        <Card className="mt-6 flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => (state.ended ? restart() : setPlaying((p) => !p))}
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {playing ? "Pause" : state.ended ? "Replay" : t > 0 ? "Resume" : "Start exam"}
            </Button>
            <Button size="sm" variant="secondary" onClick={restart}>
              <RotateCcw className="size-4" aria-hidden />
              Restart
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setT(scenario.durationSec)} disabled={state.ended}>
              <SkipForward className="size-4" aria-hidden />
              Skip to end
            </Button>
          </div>
          <div className="flex min-w-56 flex-1 items-center gap-3">
            <span className="font-mono text-sm tabular-nums">{clock(t)}</span>
            <input
              type="range"
              min={0}
              max={scenario.durationSec}
              step={1}
              value={Math.round(t)}
              onChange={(e) => setT(Number(e.target.value))}
              aria-label="Exam timeline"
              className="h-1.5 flex-1 cursor-pointer accent-[var(--primary)]"
            />
            <span className="font-mono text-sm tabular-nums text-muted-foreground">{clock(scenario.durationSec)}</span>
          </div>
          <div className="inline-flex rounded-full border border-border p-0.5 text-xs" role="group" aria-label="Playback speed">
            {SPEEDS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={speed === value}
                onClick={() => setSpeed(value)}
                className={cn("rounded-full px-3 py-1", speed === value ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
              >
                {value}×
              </button>
            ))}
          </div>
        </Card>

        {state.ended && !endSeen ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 animate-in fade-in slide-in-from-top-1">
            <p className="text-sm">
              <span className="font-medium">Exam ended at {clock(scenario.durationSec)}.</span>{" "}
              <span className="text-muted-foreground">
                {submitted} submitted, {state.students.length - submitted} auto-submitted at time up. {needReview} need
                review.
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setTab("reports");
                  setEndSeen(true);
                }}
              >
                Open reports
                <ArrowRight className="size-4" aria-hidden />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEndSeen(true)}>
                Dismiss
              </Button>
            </div>
          </div>
        ) : null}

        <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Writing", writing],
            ["Submitted", submitted],
            ["Incidents", incidents],
            ["Need review", needReview],
          ].map(([label, value]) => (
            <Card key={label as string} className="p-4">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-3xl font-medium tabular-nums">{value}</dd>
            </Card>
          ))}
        </dl>

        <div role="tablist" aria-label="Demo views" className="mt-8 flex gap-1 border-b border-border">
          {(
            [
              ["live", "Live monitoring"],
              ["feed", "Activity feed"],
              ["reports", state.ended ? "Reports" : "Reports (provisional)"],
              ["setup", "Exam setup"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-sm",
                tab === key ? "border-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <section className="mt-6" role="tabpanel">
          {tab === "live" ? (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[...state.students]
                .sort((a, b) => b.priority.score - a.priority.score || a.student.name.localeCompare(b.student.name))
                .map((s) => (
                  <StudentCard key={s.student.id} s={s} questions={scenario.questions} onOpen={() => setOpenId(s.student.id)} />
                ))}
            </ul>
          ) : null}

          {tab === "feed" ? (
            state.feed.length ? (
              <ol className="divide-y divide-border rounded-2xl border border-border bg-card">
                {state.feed.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm animate-in fade-in">
                    <span className="w-12 font-mono text-xs tabular-nums text-muted-foreground">{clock(event.t)}</span>
                    <button
                      type="button"
                      onClick={() => setOpenId(event.studentId)}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {event.studentName}
                    </button>
                    <span className="flex-1">
                      {event.label}
                      {event.detail ? <span className="text-muted-foreground"> · {event.detail}</span> : null}
                      {event.durationSec ? <span className="text-muted-foreground"> · {event.durationSec} s</span> : null}
                    </span>
                    <Badge>{SOURCE_LABEL[event.source]}</Badge>
                    <Badge tone={event.scored ? "medium" : "neutral"}>{event.scored ? `+${event.points}` : "Log only"}</Badge>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-2xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                No activity yet. Press Start exam.
              </p>
            )
          ) : null}

          {tab === "reports" ? (
            <div className="space-y-3">
              {!state.ended ? (
                <p className="text-sm text-muted-foreground">
                  The exam is still running; rankings will change until {clock(scenario.durationSec)}.
                </p>
              ) : null}
              <ol className="space-y-3">
                {ranked.map((s, index) => (
                  <Card as="li" key={s.student.id} className="flex flex-wrap items-center gap-4">
                    <span className="grid size-8 place-items-center rounded-full border border-border text-sm tabular-nums">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {s.student.name} <span className="text-sm font-normal text-muted-foreground">{s.student.roll}</span>
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {s.priority.reasons[0] ?? "No incidents."}
                      </p>
                      {state.ended ? <p className="mt-1 text-sm">{s.student.verdictHint}</p> : null}
                    </div>
                    <Badge tone={LEVEL_TONE[s.priority.level]} icon={<Gauge aria-hidden />}>
                      {sentence(s.priority.level)} · {s.priority.score}
                    </Badge>
                    {decisions[s.student.id]?.status && decisions[s.student.id].status !== "unreviewed" ? (
                      <Badge tone="accent">{sentence(decisions[s.student.id].status)}</Badge>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(s.student.id)}>
                      Review
                    </Button>
                  </Card>
                ))}
              </ol>
            </div>
          ) : null}

          {tab === "setup" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <p className="text-sm text-muted-foreground">Exam</p>
                <p className="mt-1 text-lg font-medium">{scenario.exam}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {scenario.questions} questions · {clock(scenario.durationSec)} · {scenario.students.length} students
                </p>
              </Card>
              <Card>
                <p className="text-sm text-muted-foreground">Security policy</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {scenario.policy.map((rule) => (
                    <li key={rule} className="flex items-center gap-2">
                      <CircleCheck className="size-4 text-[var(--sage-ink)]" aria-hidden />
                      {rule}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ) : null}
        </section>

        <p className="mt-10 text-xs text-muted-foreground">
          Recorded demo for presentations. Students, events and camera frames are fictional illustrations and are not
          stored anywhere; review decisions reset on restart.
        </p>
      </main>

      {selected ? (
        <StudentPanel
          s={selected}
          questions={scenario.questions}
          ended={state.ended}
          decision={decisions[selected.student.id] ?? { status: "unreviewed", note: "" }}
          onDecision={(value) => setDecisions((current) => ({ ...current, [selected.student.id]: value }))}
          onClose={() => setOpenId(null)}
        />
      ) : null}
    </div>
  );
}

function StudentCard({ s, questions, onOpen }: { s: DemoStudentState; questions: number; onOpen: () => void }) {
  const latestIncidentFrame = [...s.snapshots].reverse().find((snap) => snap.kind === "incident");
  const scene = !s.student.webcam ? null : s.onCamera ? "normal" : (latestIncidentFrame?.scene ?? "away");
  return (
    <Card as="li" interactive className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{s.student.name}</p>
          <p className="text-xs text-muted-foreground">{s.student.roll}</p>
        </div>
        <Badge tone={LEVEL_TONE[s.priority.level]} icon={<Gauge aria-hidden />}>
          {sentence(s.priority.level)} · {s.priority.score}
        </Badge>
      </div>
      {scene ? (
        <div className="relative">
          <DemoFrame scene={scene} crop className="h-32 sm:h-36" />
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">
            <Camera className="size-3" aria-hidden />
            {s.status === "writing" ? (s.onCamera ? "On camera" : "Off camera") : "Camera off"}
          </span>
        </div>
      ) : (
        <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
          {s.student.agent ? "Agent monitored · no webcam on this exam" : "No webcam on this exam"}
        </div>
      )}
      <div>
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>
            {s.answered} of {questions} answered
          </span>
          <span>{s.status === "writing" ? "Writing" : s.status === "submitted" ? "Submitted" : "Time up"}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(s.answered / questions) * 100}%` }} />
        </div>
      </div>
      <p className="min-h-10 text-sm">
        <span className="text-muted-foreground">Last: </span>
        {s.lastEvent ? `${s.lastEvent.label}${s.lastEvent.detail ? ` · ${s.lastEvent.detail}` : ""}` : "No events"}
      </p>
      <div className="mt-auto flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {s.incidents.length} incident{s.incidents.length === 1 ? "" : "s"} · score {s.score}
        </span>
        <Button size="sm" variant="secondary" onClick={onOpen}>
          Open
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

function StudentPanel({
  s,
  questions,
  ended,
  decision,
  onDecision,
  onClose,
}: {
  s: DemoStudentState;
  questions: number;
  ended: boolean;
  decision: { status: Decision; note: string };
  onDecision: (value: { status: Decision; note: string }) => void;
  onClose: () => void;
}) {
  const [frame, setFrame] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const viewing = frame !== null ? s.snapshots[frame] : null;
  const reference = s.snapshots.find((snap) => snap.kind === "reference");

  return (
    <div className="fixed inset-0 z-50 flex justify-end print:static print:block" role="dialog" aria-modal="true" aria-label={`${s.student.name} evidence`}>
      <div className="absolute inset-0 bg-black/40 print:hidden" onClick={onClose} aria-hidden />
      <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background p-6 animate-in slide-in-from-right duration-200 print:max-w-none print:border-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {s.student.roll} · {s.answered} of {questions} answered ·{" "}
              {s.status === "writing" ? "writing" : s.status === "submitted" ? "submitted" : "time up"}
            </p>
            <h2 className="mt-1 text-2xl tracking-[-0.03em]">{s.student.name}</h2>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button size="sm" variant="secondary" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden />
              Print report
            </Button>
            <button
              type="button"
              onClick={onClose}
              autoFocus
              aria-label="Close"
              className="grid size-9 place-items-center rounded-full border border-border hover:bg-muted"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <Card className="mt-6 flex items-center gap-4">
          <div
            className={cn(
              "grid size-16 shrink-0 place-items-center rounded-xl text-center",
              s.priority.level === "low"
                ? "bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]"
                : s.priority.level === "medium"
                  ? "bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]"
                  : "bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]",
            )}
          >
            <span>
              <span className="block text-xl font-medium tabular-nums">{s.priority.score}</span>
              <span className="block text-[10px] uppercase tracking-wider">{s.priority.level}</span>
            </span>
          </div>
          <div className="min-w-0 text-sm">
            <p className="text-muted-foreground">Review priority</p>
            {s.priority.reasons.length ? (
              <ul className="mt-1 space-y-0.5">
                {s.priority.reasons.map((reason, index) => (
                  <li key={`${index}-${reason}`}>{reason}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1">Nothing needs attention.</p>
            )}
          </div>
        </Card>
        {ended ? <p className="mt-3 text-sm text-muted-foreground">Reviewer note from the recording: {s.student.verdictHint}</p> : null}

        <h3 className="mt-8 text-lg">Check these first</h3>
        {s.incidents.length ? (
          <ol className="mt-3 space-y-2">
            {s.incidents.map((incident, index) => {
              const snapIndex = s.snapshots.findIndex((snap) => snap.kind === "incident" && snap.t === incident.t);
              return (
                <li key={incident.id} className="flex gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{incident.reason}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" aria-hidden />
                        {clock(incident.t)}
                      </span>
                      <span>{SOURCE_LABEL[incident.source]}</span>
                      <span>Confidence {Math.round(incident.confidence * 100)}%</span>
                      <span>Priority {incident.priority}</span>
                      <span className="inline-flex items-center gap-1">
                        <Link2 className="size-3" aria-hidden />
                        {incident.corroboratedBy.length ? "Corroborated" : "Single source"}
                      </span>
                    </p>
                  </div>
                  {snapIndex >= 0 ? (
                    <button
                      type="button"
                      onClick={() => setFrame(snapIndex)}
                      className="w-24 shrink-0 self-start overflow-hidden rounded-lg border border-border hover:border-foreground"
                      aria-label="Open snapshot"
                    >
                      <DemoFrame scene={s.snapshots[snapIndex].scene} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No scored incidents.</p>
        )}

        {s.snapshots.length ? (
          <>
            <h3 className="mt-8 text-lg">Snapshot timeline</h3>
            <ul className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {s.snapshots.map((snap, index) => (
                <li key={`${snap.t}-${index}`} className="w-28 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFrame(index)}
                    className={cn(
                      "block w-full overflow-hidden rounded-lg border-2",
                      frame === index ? "border-foreground" : snap.kind === "incident" ? "border-[var(--risk-high-fg)]/50" : "border-transparent",
                    )}
                  >
                    <DemoFrame scene={snap.scene} />
                  </button>
                  <p className={cn("mt-1 text-[11px]", snap.kind === "incident" ? "text-[var(--risk-high-fg)]" : "text-muted-foreground")}>
                    {clock(snap.t)} · {snap.kind === "incident" ? snap.label : snap.label}
                  </p>
                </li>
              ))}
            </ul>
            {viewing ? (
              <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[2fr_1fr]">
                <div>
                  <DemoFrame scene={viewing.scene} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {clock(viewing.t)} · {viewing.label}
                  </p>
                </div>
                {reference && viewing.kind !== "reference" ? (
                  <div>
                    <DemoFrame scene={reference.scene} />
                    <p className="mt-1 text-xs text-muted-foreground">Reference from the camera check</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        <h3 className="mt-8 text-lg">All activity</h3>
        {s.events.length ? (
          <ol className="mt-3 divide-y divide-border rounded-2xl border border-border bg-card text-sm">
            {s.events.map((event) => (
              <li key={event.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-12 font-mono text-xs tabular-nums text-muted-foreground">{clock(event.t)}</span>
                <span className="flex-1">
                  {event.label}
                  {event.detail ? <span className="text-muted-foreground"> · {event.detail}</span> : null}
                </span>
                <Badge>{SOURCE_LABEL[event.source]}</Badge>
                <Badge tone={event.scored ? "medium" : "neutral"}>{event.scored ? `+${event.points}` : "Log only"}</Badge>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">No events recorded.</p>
        )}

        <Card className="mt-8 print:hidden">
          <h3 className="text-lg">Reviewer decision</h3>
          <p className="mt-1 text-sm text-muted-foreground">In the demo this is kept in the page only and resets on restart.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["unreviewed", "flagged", "cleared"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={decision.status === value}
                onClick={() => onDecision({ ...decision, status: value })}
                className={cn(
                  "min-h-10 rounded-full border px-4 text-sm",
                  decision.status === value ? "border-foreground bg-primary text-primary-foreground" : "border-border hover:bg-muted",
                )}
              >
                {sentence(value)}
              </button>
            ))}
          </div>
          <label className="mt-3 block text-sm">
            <span className="text-muted-foreground">Note</span>
            <textarea
              rows={3}
              value={decision.note}
              onChange={(e) => onDecision({ ...decision, note: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2"
              placeholder="Why you flagged or cleared this session"
            />
          </label>
        </Card>
      </div>
    </div>
  );
}
