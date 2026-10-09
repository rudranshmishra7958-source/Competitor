"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { examStatus, getAttempt, loadStore, questionsForExam } from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import type { Exam } from "@exam/shared";

export default function UpcomingExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    const session = readClientSession();
    const all = loadStore().exams.filter((e) =>
      session ? e.assignedStudentIds.includes(session.userId) : false,
    );
    const visible = all.filter((e) => {
      const status = examStatus(e);
      const attempt = session ? getAttempt(e.id, session.userId) : undefined;
      const hasWritten = questionsForExam(e).some((q) => q.kind === "written");
      if (status === "completed") return false;
      if (attempt?.submittedAt && !hasWritten) return false;
      return status === "scheduled" || status === "live" || status === "draft";
    });
    setExams(visible);
  }, []);

  return (
    <>
      <PageHeader
        title="Upcoming exams"
        description="Assessments assigned to your account in this browser."
      />
      {exams.length === 0 ? (
        <EmptyState>No upcoming exams.</EmptyState>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {exams.map((exam) => {
            const status = examStatus(exam);
            const canStart = status === "live" || status === "scheduled";
            return (
              <li key={exam.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{exam.title}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {exam.type === "mcq" ? "Multiple choice" : exam.type === "written" ? "Scan answers" : "MCQ + scan"}{" "}
                    · {exam.policy.requireEndpointAgent ? "Agent required" : "Browser only"} ·{" "}
                    {exam.durationMinutes} min · {status}
                  </p>
                </div>
                {canStart && status === "live" ? (
                  <Link
                    href={`/student/exams/${exam.id}/precheck`}
                    className="text-sm text-[var(--accent)] underline"
                  >
                    {getAttempt(exam.id, readClientSession()?.userId ?? "") ? "Continue" : "Start"}
                  </Link>
                ) : (
                  <span className="text-sm text-[var(--muted)]">Not open yet</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
