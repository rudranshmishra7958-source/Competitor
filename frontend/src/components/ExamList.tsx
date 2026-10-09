"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { canEditExam, examStatus, loadStore } from "@/lib/exam-store";
import type { Exam } from "@exam/shared";
import { studentRoster } from "@/lib/exam-store";

export function ExamList() {
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    setExams(loadStore().exams);
    const refresh = () => setExams(loadStore().exams);
    window.addEventListener("exam-store-changed", refresh);
    return () => window.removeEventListener("exam-store-changed", refresh);
  }, []);

  const names = Object.fromEntries(studentRoster().map((s) => [s.userId, s.displayName]));

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <PageHeader title="Exams" description="Create, schedule, and inspect assessments." />
        <Link
          href="/admin/exams/new"
          className="shrink-0 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white"
        >
          Create exam
        </Link>
      </div>
      {exams.length === 0 ? (
        <EmptyState>No exams yet.</EmptyState>
      ) : (
        <table className="w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-left text-sm">
          <thead className="bg-[var(--background)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Start</th>
              <th className="px-4 py-2 font-medium">Assigned</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const status = examStatus(exam);
              const href = canEditExam(exam) ? `/admin/exams/${exam.id}/edit` : `/admin/exams/${exam.id}`;
              return (
                <tr key={exam.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-2">{exam.title}</td>
                  <td className="px-4 py-2">
                    {exam.type === "mcq" ? "MCQ" : exam.type === "written" ? "Scan" : "MCQ + scan"}
                    {exam.policy.requireEndpointAgent ? " · Agent required" : " · Browser only"}
                  </td>
                  <td className="px-4 py-2 capitalize">{status}</td>
                  <td className="px-4 py-2">
                    {exam.startsAt ? new Date(exam.startsAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {exam.assignedStudentIds.map((id) => names[id] ?? id).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={href} className="text-[var(--accent)] underline">
                      {canEditExam(exam) ? "Edit" : "Inspect"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
