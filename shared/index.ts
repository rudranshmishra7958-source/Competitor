/**
 * Shared contracts for frontend and (later) FastAPI-generated OpenAPI types.
 * Phase 6: replace hand-written API types with OpenAPI generation; keep these
 * domain enums aligned with the backend.
 */

export type Role = "student" | "admin";

/** College/faculty ID or institutional email. */
export type LoginIdentifier = string;

export type RiskLevel = "low" | "medium" | "high";

export type ReviewerStatus = "unreviewed" | "flagged" | "cleared";

export type PolicyMode = "enforce" | "allow_but_log";

export type MonitorSource = "browser" | "endpoint";

export interface User {
  id: string;
  role: Role;
  displayName: string;
  /** Institution-issued ID (college or faculty). */
  institutionalId: string;
  email: string;
  mustResetPassword?: boolean;
}

export interface SessionPayload {
  role: Role;
  displayName: string;
  identifier: string;
  userId: string;
  institutionalId: string;
  email: string;
  mustResetPassword?: boolean;
}

/** Browser-monitor event types (Phase 5). Endpoint source uses the same envelope. */
export type MonitorEventType =
  | "visibility_hidden"
  | "visibility_visible"
  | "window_blur"
  | "window_focus"
  | "fullscreen_enter"
  | "fullscreen_exit"
  | "clipboard_copy"
  | "clipboard_cut"
  | "clipboard_paste"
  | "contextmenu"
  | "devtools_open"
  | "navigation_away"
  | "submission_saved"
  | "agent_heartbeat"
  | "foreground_app_changed"
  | "network_state_changed"
  | "display_state_changed"
  | "session_locked"
  | "session_unlocked"
  // Webcam proctoring (on-device analysis; only stills are uploaded)
  | "face_absent"
  | "framing_lost"
  | "camera_blocked"
  | "virtual_camera"
  | "multiple_people"
  | "device_detected"
  | "camera_started"
  | "camera_stopped";

export interface MonitorEvent {
  type: MonitorEventType | string;
  timestamp: string;
  examId: string;
  studentId: string;
  sessionId: string;
  source: MonitorSource;
  metadata: Record<string, unknown>;
}

export interface WrittenSubmission {
  id: string;
  examId: string;
  studentId: string;
  questionId: string;
  imageUrl: string;
  createdAt: string;
  /** Nullable so OCR can attach later without a schema migration. */
  ocrText: string | null;
}

/** Faculty-granted webcam proctoring for a specific exam. */
export interface WebcamPolicy {
  required: boolean;
  /** Seconds without a visible face before it counts as leaving the seat. */
  awaySeconds: number;
  detectSecondPerson: boolean;
  detectDevices: boolean;
  /** How often a routine still is kept, in seconds. */
  periodicSnapshotSeconds: number;
}

export interface ExamSecurityPolicy {
  fullscreen: PolicyMode;
  tabSwitch: PolicyMode;
  clipboard: PolicyMode;
  externalApp: PolicyMode;
  externalSearch: PolicyMode;
  multiWindow: PolicyMode;
  /** If true, exam cannot start without the endpoint agent. Default false. */
  requireEndpointAgent: boolean;
  cameraOptional: boolean;
  randomizeQuestionOrder: boolean;
  randomizeOptionOrder: boolean;
  /** Present only when faculty enabled webcam proctoring for this exam. */
  webcam?: WebcamPolicy;
  cameraPresence?: PolicyMode;
  cameraPeople?: PolicyMode;
  cameraDevice?: PolicyMode;
}

export type ExamType = "mcq" | "written" | "mixed";

/** Derived from startsAt + durationMinutes (draft = no start time). */
export type ExamStatus = "draft" | "scheduled" | "live" | "completed";

export interface Exam {
  id: string;
  title: string;
  type: ExamType;
  /** ISO timestamp; empty string means draft. */
  startsAt: string;
  durationMinutes: number;
  assignedStudentIds: string[];
  policy: ExamSecurityPolicy;
  questionIds: string[];
  createdAt: string;
}

export interface McqOption {
  id: string;
  text: string;
}

export interface McqQuestion {
  id: string;
  kind: "mcq";
  prompt: string;
  options: McqOption[];
  correctOptionId: string;
}

export interface WrittenQuestion {
  id: string;
  kind: "written";
  prompt: string;
  attachmentUrl: string | null;
  ocrText: null;
}

/** Typed short answer, auto-graded against accepted answers (numeric answers allow a tolerance). */
export interface ShortAnswerQuestion {
  id: string;
  kind: "short";
  prompt: string;
  acceptedAnswers: string[];
  numeric?: boolean;
  tolerance?: number;
}

export type Question = McqQuestion | WrittenQuestion | ShortAnswerQuestion;

/** Questions answered on the main exam page (not photographed). */
export type AutoGradedQuestion = McqQuestion | ShortAnswerQuestion;

export interface Attempt {
  id: string;
  examId: string;
  studentId: string;
  startedAt: string;
  /** Phase 6: issued by the server. Mock store writes this at attempt start. */
  expiresAt: string;
  submittedAt: string | null;
}

export interface Answer {
  attemptId: string;
  questionId: string;
  /** Option id for MCQ; empty for short answers. */
  selectedOptionId: string;
  /** Typed response for short-answer questions. */
  text?: string;
}

export interface ExamSessionContract {
  sessionId: string;
  examId: string;
  studentId: string;
  startedAt: string;
  expiresAt: string;
  submittedAt: string | null;
  policy: ExamSecurityPolicy;
}

export interface ReviewDecision {
  status: ReviewerStatus;
  note: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface TimelineEvent extends MonitorEvent {
  id: number;
  receivedAt: string;
  scored: boolean;
  policyKey: keyof ExamSecurityPolicy | null;
  /** Points added when this event is an enforce-mode violation. */
  points?: number;
  /** Rule type after agent metadata mapping (for example a prohibited foreground app). */
  effectiveType?: string;
}

export interface CorrelationHit {
  rule: string;
  label: string;
  weight: number;
  eventIds: number[];
}

export type PriorityLevel = "low" | "medium" | "high" | "critical";

export interface ReviewPriority {
  /** 0-100, from the three highest-priority incidents. */
  score: number;
  level: PriorityLevel;
  reasons: string[];
  evidenceStrength: "none" | "weak" | "moderate" | "strong";
  corroboratedIncidents: number;
  singleSourceIncidents: number;
  webcam: boolean;
  cameraUptime: number | null;
  snapshotCount: number;
}

export interface Incident {
  id: string;
  type: string;
  category: "browser" | "agent" | "camera";
  title: string;
  reason: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  count: number;
  scored: boolean;
  points: number;
  confidence: number;
  corroboratedBy: string[];
  devices: string[];
  eventIds: number[];
  snapshotIds: number[];
  priority: number;
}

export interface SnapshotInfo {
  id: number;
  kind: "reference" | "periodic" | "incident";
  eventType: string | null;
  createdAt: string;
  bytes: number;
}

export interface IntegrityBreakdown {
  browser: number;
  endpoint: number;
  correlated: number;
  total: number;
}

export interface LiveSessionRow {
  sessionId: string;
  studentId: string;
  displayName: string;
  examId: string;
  connected: boolean;
  endpointConnected: boolean;
  assurance: "browser_only" | "browser_endpoint" | "agent_required_missing";
  risk: RiskLevel;
  latestAnomaly: string;
  /** Executable name from the latest foreground or prohibited-app event, when present. */
  latestAnomalyApplication?: string | null;
  review: ReviewDecision;
  breakdown: IntegrityBreakdown;
  priority?: ReviewPriority;
  latestSnapshotId?: number | null;
  topIncident?: Incident | null;
}

export interface IntegrityReportSummary {
  sessionId: string;
  examId: string;
  studentId: string;
  displayName: string;
  risk: RiskLevel;
  assurance: LiveSessionRow["assurance"];
  reviewStatus: ReviewerStatus;
  summary: string;
  updatedAt: string;
  priority?: ReviewPriority;
}

export interface IntegrityReport extends IntegrityReportSummary {
  breakdown: IntegrityBreakdown;
  correlations: CorrelationHit[];
  events: TimelineEvent[];
  review: ReviewDecision;
  submissionCount: number;
  incidents?: Incident[];
  snapshots?: SnapshotInfo[];
  ruleVersion?: string;
}

export interface SecurityAlert {
  id: number;
  identifierHint: string;
  event: "login_failed" | "account_locked" | "refresh_reuse" | string;
  createdAt: string;
  ipAddress: string | null;
}
