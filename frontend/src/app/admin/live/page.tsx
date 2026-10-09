"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { RiskChip } from "@/components/RiskChip";
import { authenticatedAdminWsUrl, fetchLiveBoard } from "@/lib/api";
import { eventLabelForAdmin } from "@/lib/event-labels";
import { getExam } from "@/lib/exam-store";
import type { LiveSessionRow } from "@exam/shared";

const DISCLAIMER =
  "Browser signals are best-effort. The score is evidence for a person, not an automatic fail.";

export default function LiveMonitoringPage() {
  const [rows, setRows] = useState<LiveSessionRow[]>([]);
  const [fromApi, setFromApi] = useState(false);
  const [examFilter, setExamFilter] = useState("all");

  useEffect(() => {
    const tick = async () => {
      const board = await fetchLiveBoard();
      if (board) {
        setRows(board);
        setFromApi(true);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 2000);
    const wsUrl = authenticatedAdminWsUrl();
    const socket = wsUrl ? new WebSocket(wsUrl) : null;
    if (socket) socket.onmessage = () => void tick();
    return () => {
      window.clearInterval(id);
      socket?.close();
    };
  }, []);

  const exams = [...new Set(rows.map((row) => row.examId))];
  const visibleRows =
    examFilter === "all" ? rows : rows.filter((row) => row.examId === examFilter);
  const counts = {
    low: visibleRows.filter((row) => row.risk === "low").length,
    medium: visibleRows.filter((row) => row.risk === "medium").length,
    high: visibleRows.filter((row) => row.risk === "high").length,
  };

  return (
    <>
      <PageHeader
        title="Live monitoring"
        description="Open a row to see the event timeline and mark Flagged or Cleared."
      />
      <p className="mb-4 text-sm text-[var(--muted)]" role="note">
        {DISCLAIMER}{" "}
        {fromApi
          ? "Risk is computed on the server."
          : "Start the API and sign in again to load live sessions."}
      </p>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-sm">
          Exam{" "}
          <select
            value={examFilter}
            onChange={(event) => setExamFilter(event.target.value)}
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1"
          >
            <option value="all">All active exams</option>
            {exams.map((examId) => (
              <option key={examId} value={examId}>
                {getExam(examId)?.title ?? examId}
              </option>
            ))}
          </select>
        </label>
        <span className="text-sm text-[var(--muted)]">
          Low {counts.low} · Medium {counts.medium} · High {counts.high}
        </span>
      </div>
      {visibleRows.length ? (
        <table className="w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-left text-sm">
          <thead className="bg-[var(--exam-bg)] text-[var(--cyan)]">
            <tr>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Exam</th>
              <th className="px-4 py-3 font-medium">Risk</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Last event</th>
              <th className="px-4 py-3 font-medium">Timeline</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.sessionId} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium">{row.displayName}</td>
                <td className="px-4 py-3">{getExam(row.examId)?.title ?? row.examId}</td>
                <td className="px-4 py-3">
                  <RiskChip level={row.risk} />
                </td>
                <td className="px-4 py-3">{row.endpointConnected ? "Connected" : "Not connected"}</td>
                <td className="px-4 py-3">
                  {eventLabelForAdmin(row.latestAnomaly, {
                    application: row.latestAnomalyApplication ?? undefined,
                  })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/live/${encodeURIComponent(row.sessionId)}`}
                    className="font-medium text-[var(--accent)] underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          No live sessions yet. A student must start an exam while this API is running.
        </p>
      )}
    </>
  );
}
