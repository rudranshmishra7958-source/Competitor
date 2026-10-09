import { EVENTS, type DemoScenario, type DemoStudent, type EventKey, type SceneKind } from "./scenarios";

export type DemoEvent = {
  id: string;
  t: number;
  key: EventKey;
  label: string;
  source: "browser" | "camera" | "agent";
  points: number;
  confidence: number;
  scored: boolean;
  detail?: string;
  durationSec?: number;
  scene?: SceneKind;
  studentId: string;
  studentName: string;
};

export type DemoIncident = DemoEvent & {
  corroboratedBy: string[];
  priority: number;
  reason: string;
};

export type PriorityLevel = "low" | "medium" | "high" | "critical";

export type DemoStudentState = {
  student: DemoStudent;
  status: "writing" | "submitted" | "time_up";
  answered: number;
  events: DemoEvent[];
  incidents: DemoIncident[];
  score: number;
  risk: "low" | "medium" | "high";
  priority: { score: number; level: PriorityLevel; reasons: string[] };
  lastEvent: DemoEvent | null;
  /** Still on camera right now (false during an away incident or covered camera). */
  onCamera: boolean;
  snapshots: { t: number; scene: SceneKind; kind: "reference" | "routine" | "incident"; label: string }[];
};

export type DemoState = {
  t: number;
  ended: boolean;
  students: DemoStudentState[];
  feed: DemoEvent[];
};

const CORROBORATION_WINDOW = 30;

function toEvent(student: DemoStudent, index: number): DemoEvent {
  const raw = student.events[index];
  const spec = EVENTS[raw.key];
  return {
    id: `${student.id}-${index}`,
    t: raw.t,
    key: raw.key,
    label: spec.label,
    source: spec.source,
    points: spec.points + (raw.key === "face_absent" ? Math.min(3, Math.max(0, Math.floor(((raw.durationSec ?? 5) - 5) / 10))) : 0),
    confidence: spec.confidence,
    scored: spec.points > 0,
    detail: raw.detail,
    durationSec: raw.durationSec,
    scene: "scene" in spec ? spec.scene : undefined,
    studentId: student.id,
    studentName: student.name,
  };
}

function levelFor(score: number): PriorityLevel {
  if (score >= 60) return "critical";
  if (score >= 35) return "high";
  if (score >= 15) return "medium";
  return "low";
}

function studentAt(student: DemoStudent, t: number, examEnded: boolean): DemoStudentState {
  const events = student.events
    .map((_, i) => toEvent(student, i))
    .filter((event) => event.t <= t)
    .sort((a, b) => a.t - b.t);

  const incidents: DemoIncident[] = events
    .filter((event) => event.scored)
    .map((event) => {
      const corroboratedBy = [
        ...new Set(
          events
            .filter(
              (other) =>
                other.id !== event.id &&
                other.source !== event.source &&
                Math.abs(other.t - event.t) <= CORROBORATION_WINDOW,
            )
            .map((other) => other.label.toLowerCase()),
        ),
      ];
      const duration = 1 + Math.min(1, (event.durationSec ?? 0) / 60);
      const priority = Math.round(event.points * event.confidence * (corroboratedBy.length ? 1.5 : 1) * duration * 10) / 10;
      const extra = event.detail ? ` (${event.detail})` : event.durationSec ? ` (${event.durationSec} s)` : "";
      const reason = `${event.label}${extra}${corroboratedBy.length ? ` while ${corroboratedBy[0]}` : ""}`;
      return { ...event, corroboratedBy, priority, reason };
    })
    .sort((a, b) => b.priority - a.priority || a.t - b.t);

  const correlatedBonus = incidents.filter((incident) => incident.corroboratedBy.length).length * 2;
  const score = incidents.reduce((sum, incident) => sum + incident.points, 0) + correlatedBonus;
  const risk = score >= 8 ? "high" : score >= 3 ? "medium" : "low";
  const top = incidents.slice(0, 3);
  const priorityScore = Math.min(100, Math.round(top.reduce((sum, incident) => sum + incident.priority, 0) * 5));

  const answered = student.answers.filter((at) => at <= t).length;
  const submitted = student.submitAt !== null && t >= student.submitAt;
  const status = submitted ? "submitted" : examEnded ? "time_up" : "writing";

  const offCamera = events.some(
    (event) =>
      (event.key === "face_absent" && t < event.t + (event.durationSec ?? 5)) ||
      (event.key === "camera_blocked" && t < event.t + 8),
  );

  const snapshots: DemoStudentState["snapshots"] = [];
  if (student.webcam) {
    snapshots.push({ t: 0, scene: "normal", kind: "reference", label: "Reference" });
    for (let at = 30; at <= Math.min(t, student.submitAt ?? Infinity); at += 30) {
      snapshots.push({ t: at, scene: "normal", kind: "routine", label: "Routine" });
    }
    for (const event of events) {
      if (event.scene) snapshots.push({ t: event.t, scene: event.scene, kind: "incident", label: event.label });
    }
    snapshots.sort((a, b) => a.t - b.t);
  }

  return {
    student,
    status,
    answered,
    events,
    incidents,
    score,
    risk,
    priority: { score: priorityScore, level: levelFor(priorityScore), reasons: top.map((incident) => incident.reason) },
    lastEvent: events.at(-1) ?? null,
    onCamera: student.webcam && !offCamera && !submitted,
    snapshots,
  };
}

/** Deterministic: the same scenario and time always produce the same state. */
export function demoStateAt(scenario: DemoScenario, t: number): DemoState {
  const clamped = Math.max(0, Math.min(scenario.durationSec, t));
  const ended = clamped >= scenario.durationSec;
  const students = scenario.students.map((student) => studentAt(student, clamped, ended));
  const feed = students.flatMap((state) => state.events).sort((a, b) => b.t - a.t);
  return { t: clamped, ended, students, feed };
}

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
