import type {
  ExamSessionContract,
  IntegrityReport,
  IntegrityReportSummary,
  LiveSessionRow,
  MonitorEvent,
  ReviewDecision,
  ReviewerStatus,
  Role,
  SecurityAlert,
  SessionPayload,
  TimelineEvent,
} from "@exam/shared";

const TOKEN_KEY = "exam_jwt";

export function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function wsBase(): string {
  return process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/ws/events";
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function readToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export type RemoteLoginResult =
  | { kind: "ok"; user: SessionPayload; mustResetPassword: boolean }
  | { kind: "rejected"; message: string }
  | { kind: "unavailable" };

export async function loginRemote(
  identifier: string,
  password: string,
  role: Role,
): Promise<RemoteLoginResult> {
  try {
    const res = await fetch(`${apiBase()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password, role }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      return { kind: "rejected", message: body.detail ?? "Invalid credentials." };
    }
    const data = (await res.json()) as {
      access_token: string;
      user: SessionPayload;
      must_reset_password?: boolean;
      mustResetPassword?: boolean;
    };
    saveToken(data.access_token);
    return {
      kind: "ok",
      user: data.user,
      mustResetPassword: Boolean(
        data.mustResetPassword ?? data.must_reset_password ?? data.user.mustResetPassword,
      ),
    };
  } catch {
    return { kind: "unavailable" };
  }
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase()}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { access_token: string };
    saveToken(body.access_token);
    return true;
  } catch {
    return false;
  }
}

export async function apiRequest(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<Response> {
  const token = readToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 401 && retry && (await refreshAccessToken())) {
    return apiRequest(path, init, false);
  }
  return res;
}

function asReview(value: unknown): ReviewDecision {
  const row = (value ?? {}) as {
    status?: ReviewerStatus;
    decision?: ReviewerStatus;
    note?: string;
    reviewedBy?: string | null;
    reviewerId?: string | null;
    reviewedAt?: string | null;
  };
  const status = row.status ?? row.decision ?? "unreviewed";
  return {
    status,
    note: row.note ?? "",
    reviewedBy: row.reviewedBy ?? row.reviewerId ?? null,
    reviewedAt: row.reviewedAt ?? null,
  };
}

function asLiveRow(value: unknown): LiveSessionRow {
  const row = value as {
    sessionId: string;
    studentId: string;
    displayName: string;
    examId: string;
    connected?: boolean;
    browserConnected?: boolean;
    endpointConnected?: boolean;
    assurance?: LiveSessionRow["assurance"];
    risk?: LiveSessionRow["risk"] | { risk?: LiveSessionRow["risk"] };
    latestAnomaly?: string;
    latestAnomalyApplication?: string | null;
    review?: unknown;
    breakdown?: LiveSessionRow["breakdown"];
    browser?: number;
    endpoint?: number;
    correlated?: number;
    score?: number;
  };
  const riskValue = row.risk;
  const risk =
    typeof riskValue === "string" ? riskValue : (riskValue?.risk ?? "low");
  return {
    sessionId: row.sessionId,
    studentId: row.studentId,
    displayName: row.displayName,
    examId: row.examId,
    connected: Boolean(row.connected ?? row.browserConnected),
    endpointConnected: Boolean(row.endpointConnected),
    assurance: row.assurance ?? "browser_only",
    risk,
    latestAnomaly: row.latestAnomaly ?? "None",
    latestAnomalyApplication: row.latestAnomalyApplication ?? null,
    review: asReview(row.review),
    breakdown: row.breakdown ?? {
      browser: row.browser ?? 0,
      endpoint: row.endpoint ?? 0,
      correlated: row.correlated ?? 0,
      total: row.score ?? 0,
    },
  };
}

function asReportSummary(value: unknown): IntegrityReportSummary {
  const row = value as {
    sessionId: string;
    examId: string;
    studentId: string;
    displayName: string;
    integritySummary?: string;
    summary?: string;
    reviewStatus?: ReviewerStatus;
    review?: ReviewDecision;
    assurance?: LiveSessionRow["assurance"];
    updatedAt?: string;
    risk?: IntegrityReportSummary["risk"] | { risk?: IntegrityReportSummary["risk"] };
  };
  const riskValue = row.risk;
  return {
    sessionId: row.sessionId,
    examId: row.examId,
    studentId: row.studentId,
    displayName: row.displayName,
    risk: typeof riskValue === "string" ? riskValue : (riskValue?.risk ?? "low"),
    assurance: row.assurance ?? "browser_only",
    reviewStatus: row.reviewStatus ?? row.review?.status ?? "unreviewed",
    summary: row.summary ?? row.integritySummary ?? "",
    updatedAt: row.updatedAt ?? "",
  };
}

function asTimelineEvent(value: TimelineEvent): TimelineEvent {
  return {
    ...value,
    metadata: value.metadata ?? {},
    scored: Boolean(value.scored),
    points: typeof value.points === "number" ? value.points : undefined,
    effectiveType: value.effectiveType,
  };
}

function asReport(value: unknown): IntegrityReport {
  const row = value as IntegrityReport;
  return {
    ...asReportSummary(row),
    breakdown: row.breakdown ?? { browser: 0, endpoint: 0, correlated: 0, total: 0 },
    correlations: row.correlations ?? [],
    events: (row.events ?? []).map(asTimelineEvent),
    review: asReview(row.review),
    submissionCount: row.submissionCount ?? 0,
  };
}

function asAlert(value: unknown): SecurityAlert {
  const row = value as SecurityAlert & { identifier?: string; reason?: string };
  return {
    id: row.id,
    identifierHint: row.identifierHint ?? row.identifier ?? "",
    event: row.event ?? row.reason ?? "login_failed",
    createdAt: row.createdAt,
    ipAddress: row.ipAddress ?? null,
  };
}

export async function registerExamSession(
  contract: ExamSessionContract,
): Promise<boolean> {
  try {
    const res = await apiRequest("/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contract),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type EventIngestResult = {
  accepted: boolean;
  rateLimited?: boolean;
  violation?: {
    scored: boolean;
    effectiveType: string;
    pointsAdded: number;
    totalScore: number;
    risk: string;
    application?: string;
  };
};

export async function postMonitorEvent(
  event: MonitorEvent,
): Promise<EventIngestResult | "offline"> {
  try {
    const res = await apiRequest("/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!res.ok) return { accepted: false };
    return (await res.json()) as EventIngestResult;
  } catch {
    return "offline";
  }
}

export async function sendMonitorEvent(event: MonitorEvent): Promise<boolean> {
  const result = await postMonitorEvent(event);
  return result !== "offline" && result.accepted;
}

export function authenticatedEventsWsUrl(): string | null {
  const token = readToken();
  if (!token) return null;
  const url = new URL(wsBase());
  url.searchParams.set("token", token);
  return url.toString();
}

export function authenticatedAdminWsUrl(): string | null {
  const token = readToken();
  if (!token) return null;
  const url = new URL(wsBase());
  url.pathname = "/ws/admin";
  url.searchParams.set("token", token);
  return url.toString();
}

export async function fetchLiveBoard(): Promise<LiveSessionRow[] | null> {
  try {
    const res = await apiRequest("/admin/live");
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown[];
    return rows.map(asLiveRow);
  } catch {
    return null;
  }
}

export async function fetchOwnSession(sessionId: string): Promise<LiveSessionRow | null> {
  try {
    const res = await apiRequest(`/sessions/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    return asLiveRow(await res.json());
  } catch {
    return null;
  }
}

export async function fetchTimeline(
  sessionId: string,
): Promise<{ session: LiveSessionRow; events: TimelineEvent[] } | null> {
  try {
    const res = await apiRequest(`/admin/sessions/${encodeURIComponent(sessionId)}/timeline`);
    if (!res.ok) return null;
    const body = (await res.json()) as { session: unknown; events: TimelineEvent[] };
    return { session: asLiveRow(body.session), events: (body.events ?? []).map(asTimelineEvent) };
  } catch {
    return null;
  }
}

export async function updateReview(
  sessionId: string,
  status: ReviewerStatus,
  note: string,
): Promise<ReviewDecision | null> {
  try {
    const res = await apiRequest(`/admin/sessions/${encodeURIComponent(sessionId)}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: status, status, note }),
    });
    if (!res.ok) return null;
    return asReview(await res.json());
  } catch {
    return null;
  }
}

export async function createAgentToken(sessionId: string): Promise<string | null> {
  try {
    const res = await apiRequest("/agent/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string; access_token?: string };
    return body.token ?? body.access_token ?? null;
  } catch {
    return null;
  }
}

export async function markSessionSubmitted(sessionId: string): Promise<void> {
  try {
    await apiRequest(`/sessions/${encodeURIComponent(sessionId)}/submit`, {
      method: "POST",
    });
  } catch {
    /* Local exam completion still works if the backend is unavailable. */
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await apiRequest("/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const body = (await res.json().catch(() => ({}))) as { detail?: string };
    return {
      ok: res.ok,
      message: res.ok ? "Password changed." : body.detail ?? "Password change failed.",
    };
  } catch {
    return { ok: false, message: "The authentication server is unavailable." };
  }
}

export async function logoutRemote(): Promise<void> {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}

export async function fetchReports(): Promise<IntegrityReportSummary[] | null> {
  try {
    const res = await apiRequest("/admin/reports");
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown[];
    return rows.map(asReportSummary);
  } catch {
    return null;
  }
}

export async function fetchReport(sessionId: string): Promise<IntegrityReport | null> {
  try {
    const res = await apiRequest(`/admin/reports/${encodeURIComponent(sessionId)}`);
    return res.ok ? asReport(await res.json()) : null;
  } catch {
    return null;
  }
}

export async function downloadReport(
  sessionId: string,
  format: "csv" | "pdf",
): Promise<boolean> {
  try {
    const res = await apiRequest(
      `/admin/reports/${encodeURIComponent(sessionId)}/export.${format}`,
    );
    if (!res.ok) return false;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `integrity-${sessionId}.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function fetchSecurityAlerts(): Promise<SecurityAlert[] | null> {
  try {
    const res = await apiRequest("/admin/security/alerts");
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown[];
    return rows.map(asAlert);
  } catch {
    return null;
  }
}
