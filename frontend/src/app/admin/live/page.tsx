"use client";

import {
  ArrowRight,
  FlaskConical,
  LayoutGrid,
  OctagonAlert,
  PlugZap,
  Radio,
  Rows3,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RiskChip } from "@/components/RiskChip";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableWrap, td, th } from "@/components/ui/Table";
import {
  authenticatedAdminWsUrl,
  clearSimulations,
  fetchLiveBoard,
  simulateSession,
  type SimulationScenario,
} from "@/lib/api";
import { PriorityBadge, SnapshotImage } from "@/components/proctor/ReviewEvidence";
import { eventLabelForAdmin } from "@/lib/event-labels";
import { getExam } from "@/lib/exam-store";
import type { LiveSessionRow, RiskLevel } from "@exam/shared";
import { sentence } from "@/lib/utils";

const DISCLAIMER =
  "Browser signals are best-effort. The score is evidence for a person, not an automatic fail.";

const RISK_ORDER: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };

const SCENARIOS: { value: SimulationScenario; label: string }[] = [
  { value: "tab_hopper", label: "Tab hopper (leaves the exam tab)" },
  { value: "copy_paste", label: "Copy / paste activity" },
  { value: "app_switcher", label: "Prohibited apps + second display" },
  { value: "webcam_violations", label: "Webcam: away, phone, second person" },
  { value: "clean", label: "Clean session" },
];

type View = "grid" | "table";
type Alert = { sessionId: string; name: string };

function readView(): View {
  try {
    return localStorage.getItem("live-view") === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}

function lastEvent(row: LiveSessionRow): string {
  return eventLabelForAdmin(row.latestAnomaly, {
    application: row.latestAnomalyApplication ?? undefined,
  });
}

const sessionHref = (row: LiveSessionRow) => `/admin/live/${encodeURIComponent(row.sessionId)}`;

export default function LiveMonitoringPage() {
  const [rows, setRows] = useState<LiveSessionRow[]>([]);
  const [fromApi, setFromApi] = useState(false);
  const [socketLive, setSocketLive] = useState(false);
  const [examFilter, setExamFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [view, setView] = useState<View>("grid");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [scenario, setScenario] = useState<SimulationScenario>("tab_hopper");
  const [busy, setBusy] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");
  const seenRisk = useRef<Map<string, RiskLevel> | null>(null);

  useEffect(() => {
    setView(readView());
  }, []);

  useEffect(() => {
    const tick = async () => {
      const board = await fetchLiveBoard();
      if (!board) return;
      // Alert when a session newly reaches High (skip the first load so old sessions don't fire).
      const previous = seenRisk.current;
      if (previous) {
        const fresh = board.filter(
          (row) => row.risk === "high" && previous.get(row.sessionId) !== "high",
        );
        if (fresh.length) {
          setAlerts((current) => [
            ...fresh.map((row) => ({ sessionId: row.sessionId, name: row.displayName })),
            ...current,
          ].slice(0, 3));
        }
      }
      seenRisk.current = new Map(board.map((row) => [row.sessionId, row.risk]));
      setRows(board);
      setFromApi(true);
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    const wsUrl = authenticatedAdminWsUrl();
    const socket = wsUrl ? new WebSocket(wsUrl) : null;
    if (socket) {
      socket.onopen = () => setSocketLive(true);
      socket.onclose = () => setSocketLive(false);
      socket.onmessage = () => void tick();
    }
    return () => {
      window.clearInterval(id);
      socket?.close();
    };
  }, []);

  useEffect(() => {
    if (!alerts.length) return;
    const id = window.setTimeout(() => setAlerts((current) => current.slice(0, -1)), 10_000);
    return () => window.clearTimeout(id);
  }, [alerts]);

  function changeView(next: View) {
    setView(next);
    try {
      localStorage.setItem("live-view", next);
    } catch {
      /* storage unavailable */
    }
  }

  async function simulate() {
    setBusy(true);
    const row = await simulateSession(scenario);
    setBusy(false);
    setDemoMessage(
      row ? `Simulated ${row.displayName} (${row.risk} risk).` : "Simulation failed — is the API in demo mode?",
    );
  }

  async function clearDemo() {
    setBusy(true);
    const ok = await clearSimulations();
    setBusy(false);
    setDemoMessage(ok ? "Simulated sessions removed." : "Could not clear simulated sessions.");
  }

  const exams = [...new Set(rows.map((row) => row.examId))];
  const byExam = examFilter === "all" ? rows : rows.filter((row) => row.examId === examFilter);
  const counts = {
    low: byExam.filter((row) => row.risk === "low").length,
    medium: byExam.filter((row) => row.risk === "medium").length,
    high: byExam.filter((row) => row.risk === "high").length,
  };
  const visibleRows = (riskFilter === "all" ? byExam : byExam.filter((r) => r.risk === riskFilter))
    .slice()
    .sort(
      (a, b) =>
        (b.priority?.score ?? 0) - (a.priority?.score ?? 0) ||
        RISK_ORDER[a.risk] - RISK_ORDER[b.risk] ||
        b.breakdown.total - a.breakdown.total ||
        a.displayName.localeCompare(b.displayName),
    );

  const chip = (value: RiskLevel | "all", label: string) => (
    <button
      type="button"
      aria-pressed={riskFilter === value}
      onClick={() => setRiskFilter(value)}
      className={`min-h-9 rounded-full border px-3 text-xs font-medium ${
        riskFilter === value
          ? "border-foreground bg-muted text-foreground"
          : "border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <PageHeader
        title="Live monitoring"
        description="Sessions are sorted by review priority. Open one to see its evidence and mark Flagged or Cleared."
        actions={
          <div className="surface inline-flex rounded-xl p-0.5" role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={view === "grid"}
              onClick={() => changeView("grid")}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm ${
                view === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="size-4" aria-hidden />
              Grid
            </button>
            <button
              type="button"
              aria-pressed={view === "table"}
              onClick={() => changeView("table")}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-[10px] px-3 text-sm ${
                view === "table" ? "bg-muted text-foreground" : "text-muted-foreground"
              }`}
            >
              <Rows3 className="size-4" aria-hidden />
              Table
            </button>
          </div>
        }
      />

      <div aria-live="polite" className="fixed right-4 top-20 z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
        {alerts.map((alert) => (
          <div
            key={alert.sessionId}
            className="surface-float rise flex items-start gap-3 rounded-2xl !border-[var(--risk-high-fg)] p-3 text-sm"
          >
            <OctagonAlert className="mt-0.5 size-5 shrink-0 text-[var(--risk-high-fg)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{alert.name} reached High risk</p>
              <Link
                href={`/admin/live/${encodeURIComponent(alert.sessionId)}`}
                className="text-foreground underline-offset-2 hover:underline"
              >
                Review timeline
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dismiss alert"
              onClick={() => setAlerts((current) => current.filter((a) => a.sessionId !== alert.sessionId))}
              className="grid size-7 place-items-center rounded-lg hover:bg-muted"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>

      <p className="mb-4 flex items-start gap-2 text-sm text-muted-foreground" role="note">
        <Radio
          className={`mt-0.5 size-4 shrink-0 ${fromApi ? "text-[var(--risk-low-fg)]" : ""}`}
          aria-hidden
        />
        <span>
          {fromApi ? (
            <>
              <span className="font-medium text-foreground">
                {socketLive ? "Live updates on" : "Polling every 2 s"}
              </span>
              {" · "}
            </>
          ) : null}
          {DISCLAIMER}{" "}
          {fromApi
            ? "Risk is computed on the server."
            : "Start the API and sign in again to load live sessions."}
        </span>
      </p>

      {fromApi ? (
        <Card className="mb-5 flex flex-wrap items-end gap-3 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FlaskConical className="size-4 text-foreground" aria-hidden />
            Demo tools
          </div>
          <label className="text-sm">
            <span className="sr-only">Scenario</span>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value as SimulationScenario)}
              className="min-h-10 rounded-xl border border-border px-3"
            >
              {SCENARIOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" onClick={simulate} loading={busy}>
            Simulate student
          </Button>
          <Button size="sm" variant="ghost" onClick={clearDemo} disabled={busy}>
            <Trash2 className="size-4" aria-hidden />
            Clear simulated
          </Button>
          {demoMessage ? (
            <span className="text-sm text-muted-foreground" role="status">
              {demoMessage}
            </span>
          ) : null}
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm">
          <span className="sr-only">Exam</span>
          <select
            value={examFilter}
            onChange={(event) => setExamFilter(event.target.value)}
            className="min-h-10 rounded-xl border border-border px-3"
          >
            <option value="all">All active exams</option>
            {exams.map((examId) => (
              <option key={examId} value={examId}>
                {getExam(examId)?.title ?? examId}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by risk">
          {chip("all", `All ${byExam.length}`)}
          {chip("high", `High ${counts.high}`)}
          {chip("medium", `Medium ${counts.medium}`)}
          {chip("low", `Low ${counts.low}`)}
        </div>
      </div>

      {!visibleRows.length ? (
        <p className="surface rounded-2xl px-4 py-10 text-center text-sm text-muted-foreground">
          {rows.length
            ? "No sessions match these filters."
            : "No live sessions yet. A student must start an exam while the API is running, or use Simulate student."}
        </p>
      ) : view === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRows.map((row) => (
            <Card
              as="li"
              key={row.sessionId}
              interactive
              className="flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{row.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getExam(row.examId)?.title ?? row.examId}
                  </p>
                </div>
                <RiskChip level={row.risk} />
              </div>
              {row.latestSnapshotId ? (
                <SnapshotImage
                  id={row.latestSnapshotId}
                  alt={`Latest camera snapshot of ${row.displayName}`}
                  className="aspect-[4/3] w-full rounded-xl"
                />
              ) : null}
              {row.priority ? (
                <div className="space-y-1">
                  <PriorityBadge priority={row.priority} />
                  {row.priority.reasons[0] ? (
                    <p className="text-xs text-muted-foreground">{row.priority.reasons[0]}</p>
                  ) : null}
                </div>
              ) : null}
              <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                {(
                  [
                    ["Browser", row.breakdown.browser],
                    ["Agent", row.breakdown.endpoint],
                    ["Total", row.breakdown.total],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-muted px-2 py-1.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-base font-medium tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="min-h-10 text-sm">
                <span className="text-muted-foreground">Last: </span>
                {lastEvent(row)}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={row.connected ? "low" : "neutral"}>
                    {row.connected ? "Online" : "Offline"}
                  </Badge>
                  <Badge
                    tone={row.endpointConnected ? "low" : "neutral"}
                    icon={<PlugZap className="size-3" aria-hidden />}
                  >
                    {row.endpointConnected ? "Agent" : "No agent"}
                  </Badge>
                  {row.review.status !== "unreviewed" ? (
                    <Badge tone="accent">
                      {sentence(row.review.status)}
                    </Badge>
                  ) : null}
                </div>
                <ButtonLink href={sessionHref(row)} variant="secondary" size="sm">
                  Open
                  <ArrowRight className="size-3.5" aria-hidden />
                </ButtonLink>
              </div>
            </Card>
          ))}
        </ul>
      ) : (
        <TableWrap caption="Live exam sessions">
          <thead>
            <tr>
              <th scope="col" className={th}>Student</th>
              <th scope="col" className={th}>Exam</th>
              <th scope="col" className={th}>Risk</th>
              <th scope="col" className={th}>Priority</th>
              <th scope="col" className={th}>Agent</th>
              <th scope="col" className={th}>Last event</th>
              <th scope="col" className={th}>Timeline</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.sessionId}
                className={row.risk === "high" ? "bg-[var(--risk-high-bg)]" : "hover:bg-muted"}
              >
                <td className={`${td} font-medium`}>{row.displayName}</td>
                <td className={td}>{getExam(row.examId)?.title ?? row.examId}</td>
                <td className={td}>
                  <RiskChip level={row.risk} />
                </td>
                <td className={td}>
                  {row.priority ? <PriorityBadge priority={row.priority} /> : row.breakdown.total}
                </td>
                <td className={td}>
                  <Badge tone={row.endpointConnected ? "low" : "neutral"}>
                    {row.endpointConnected ? "Connected" : "Not connected"}
                  </Badge>
                </td>
                <td className={td}>{lastEvent(row)}</td>
                <td className={td}>
                  <ButtonLink href={sessionHref(row)} variant="secondary" size="sm">
                    Open
                    <ArrowRight className="size-3.5" aria-hidden />
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
