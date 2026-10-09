"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { examStatus, getAttempt, loadStore, questionsForExam, submissionsForStudent } from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import type { Exam } from "@exam/shared";

export default function PastExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const session = readClientSession();
    if (!session) return;
    setUserId(session.userId);
    const mine = loadStore().exams.filter((e) => e.assignedStudentIds.includes(session.userId));
    setExams(
      mine.filter((e) => {
        const attempt = getAttempt(e.id, session.userId);
        const scans = submissionsForStudent(e.id, session.userId);
        return examStatus(e) === "completed" || Boolean(attempt?.submittedAt) || scans.length > 0;
      }),
    );
  }, []);

  return (
    <>
      <PageHeader title="Past exams" description="Submitted MCQs, written scans, or expired sittings." />
      {exams.length === 0 ? (
        <EmptyState>No past exams in this browser store.</EmptyState>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {exams.map((exam) => {
            const hasWritten = questionsForExam(exam).some((q) => q.kind === "written");
            return (
              <li key={exam.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{exam.title}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {exam.startsAt ? new Date(exam.startsAt).toLocaleString() : "—"}
                  </p>
                </div>
                {hasWritten && userId ? (
                  <Link
                    href={`/student/exams/${exam.id}/written`}
                    className="text-sm text-[var(--accent)] underline"
                  >
                    Scan history
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
