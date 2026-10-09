import type { WebcamPolicy } from "@exam/shared";

export type CameraIncidentType =
  | "face_absent"
  | "multiple_people"
  | "device_detected"
  | "framing_lost"
  | "camera_blocked";

/** One analysed frame. `objects`/`framed` are undefined on frames where that model didn't run. */
export type CameraSample = {
  at: number;
  faces: number;
  faceConfidence: number;
  framed?: boolean;
  posePeople?: number;
  objects?: { persons: number; devices: { label: string; score: number }[] };
  dark: boolean;
  frozen: boolean;
};

export type CameraEmission =
  | { stage: "open"; type: CameraIncidentType; at: number; metadata: Record<string, unknown> }
  | { stage: "close"; type: CameraIncidentType; at: number; durationMs: number; metadata: Record<string, unknown> };

const COOLDOWN_MS = 20_000;
const FRAMING_GRACE_MS = 10_000;
const BLOCKED_GRACE_MS = 3_000;

/**
 * Debounced rules so a single bad frame never raises an incident:
 *  - away: no face for `awaySeconds` continuously (closes with the full duration)
 *  - second person: 2+ faces/people in 3 of the last 5 frames
 *  - device: phone/laptop/screen in 2 of the last 3 object passes
 *  - framing: desk/shoulders lost 10 s while a face is still visible
 *  - blocked: dark or frozen picture for 3 s
 */
export class CameraRules {
  private since = new Map<CameraIncidentType, number>();
  private open = new Map<CameraIncidentType, number>();
  private cooldownUntil = new Map<CameraIncidentType, number>();
  private peopleWindow: boolean[] = [];
  private deviceWindow: { label: string; score: number }[][] = [];
  private openMeta = new Map<CameraIncidentType, Record<string, unknown>>();

  constructor(private policy: Pick<WebcamPolicy, "awaySeconds" | "detectSecondPerson" | "detectDevices">) {}

  update(sample: CameraSample): CameraEmission[] {
    const out: CameraEmission[] = [];
    const { at } = sample;

    // Away from the seat (no face). A blocked camera is reported as blocked, not away.
    const noFace = sample.faces === 0 && !sample.dark && !sample.frozen;
    this.sustained("face_absent", noFace, at, this.policy.awaySeconds * 1000, out, { confidence: 0.9 });

    if (this.policy.detectSecondPerson) {
      const crowd =
        sample.faces >= 2 || (sample.posePeople ?? 0) >= 2 || (sample.objects?.persons ?? 0) >= 2;
      this.peopleWindow = [...this.peopleWindow, crowd].slice(-5);
      const hits = this.peopleWindow.filter(Boolean).length;
      const count = Math.max(sample.faces, sample.posePeople ?? 0, sample.objects?.persons ?? 0);
      this.windowed("multiple_people", hits >= 3, hits === 0, at, out, {
        count,
        confidence: Math.min(0.95, 0.6 + hits * 0.08),
      });
    }

    if (this.policy.detectDevices && sample.objects) {
      const strong = sample.objects.devices.filter((d) => d.score >= 0.6);
      this.deviceWindow = [...this.deviceWindow, strong].slice(-3);
      const hits = this.deviceWindow.filter((frame) => frame.length > 0).length;
      const best = this.deviceWindow.flat().sort((a, b) => b.score - a.score)[0];
      this.windowed("device_detected", hits >= 2, hits === 0, at, out, {
        label: best?.label ?? "device",
        confidence: Number((best?.score ?? 0.6).toFixed(2)),
      });
    }

    if (sample.framed !== undefined) {
      const lost = sample.faces > 0 && sample.framed === false;
      this.sustained("framing_lost", lost, at, FRAMING_GRACE_MS, out, { confidence: 0.7 });
    }

    this.sustained("camera_blocked", sample.dark || sample.frozen, at, BLOCKED_GRACE_MS, out, {
      reason: sample.dark ? "dark" : "frozen",
      confidence: 0.85,
    });
    return out;
  }

  /** Closes everything still open (exam ended or camera stopped). */
  flush(at: number): CameraEmission[] {
    const out: CameraEmission[] = [];
    for (const type of [...this.open.keys()]) this.close(type, at, out);
    return out;
  }

  isOpen(type: CameraIncidentType): boolean {
    return this.open.has(type);
  }

  private sustained(
    type: CameraIncidentType,
    active: boolean,
    at: number,
    thresholdMs: number,
    out: CameraEmission[],
    metadata: Record<string, unknown>,
  ) {
    if (!active) {
      this.since.delete(type);
      if (this.open.has(type)) this.close(type, at, out);
      return;
    }
    const start = this.since.get(type) ?? at;
    this.since.set(type, start);
    if (!this.open.has(type) && at - start >= thresholdMs && at >= (this.cooldownUntil.get(type) ?? 0)) {
      this.open.set(type, start);
      this.openMeta.set(type, metadata);
      out.push({ stage: "open", type, at, metadata: { ...metadata, sinceMs: at - start } });
    }
  }

  private windowed(
    type: CameraIncidentType,
    trigger: boolean,
    clear: boolean,
    at: number,
    out: CameraEmission[],
    metadata: Record<string, unknown>,
  ) {
    if (this.open.has(type)) {
      if (clear) this.close(type, at, out);
      return;
    }
    if (trigger && at >= (this.cooldownUntil.get(type) ?? 0)) {
      this.open.set(type, at);
      this.openMeta.set(type, metadata);
      out.push({ stage: "open", type, at, metadata });
    }
  }

  private close(type: CameraIncidentType, at: number, out: CameraEmission[]) {
    const start = this.open.get(type);
    if (start === undefined) return;
    this.open.delete(type);
    this.cooldownUntil.set(type, at + COOLDOWN_MS);
    out.push({
      stage: "close",
      type,
      at,
      durationMs: Math.max(0, at - start),
      metadata: this.openMeta.get(type) ?? {},
    });
    this.openMeta.delete(type);
  }
}
