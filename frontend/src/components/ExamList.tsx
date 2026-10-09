"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Search } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { TableWrap, td, th } from "@/components/ui/Table";
import { canEditExam, examFormatLabel, examStatus, loadStore } from "@/lib/exam-store";
import type { Exam } from "@exam/shared";
import { sentence } from "@/lib/utils";
import { studentRoster } from "@/lib/exam-store";

const statusTone = {
  live: "low",
  scheduled: "accent",
  draft: "neutral",
  completed: "neutral",
} as const;

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
      <PageHeader
        title="Exams"
        description="Create, schedule, and inspect assessments."
        actions={
          <ButtonLink href="/admin/exams/new">
            <Plus className="size-4" aria-hidden />
            Create exam
          </ButtonLink>
        }
      />
      {exams.length === 0 ? (
        <EmptyState>No exams yet.</EmptyState>
      ) : (
        <TableWrap caption="Exams">
          <thead>
            <tr>
              <th scope="col" className={th}>Title</th>
              <th scope="col" className={th}>Type</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Start</th>
              <th scope="col" className={th}>Assigned</th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => {
              const status = examStatus(exam);
              const editable = canEditExam(exam);
              const href = editable ? `/admin/exams/${exam.id}/edit` : `/admin/exams/${exam.id}`;
              return (
                <tr key={exam.id} className="hover:bg-[var(--nav-active-bg)]">
                  <td className={`${td} font-medium`}>{exam.title}</td>
                  <td className={td}>
                    {examFormatLabel(exam)}
                    <span className="block text-xs text-[var(--muted)]">
                      {exam.policy.requireEndpointAgent ? "Agent required" : "Browser only"}
                    </span>
                  </td>
                  <td className={td}>
                    <Badge tone={statusTone[status as keyof typeof statusTone] ?? "neutral"} >
                      {sentence(status)}
                    </Badge>
                  </td>
                  <td className={td}>
                    {exam.startsAt ? new Date(exam.startsAt).toLocaleString() : "—"}
                  </td>
                  <td className={td}>
                    {exam.assignedStudentIds.map((id) => names[id] ?? id).join(", ") || "—"}
                  </td>
                  <td className={td}>
                    <ButtonLink href={href} variant="ghost" size="sm">
                      {editable ? (
                        <Pencil className="size-4" aria-hidden />
                      ) : (
                        <Search className="size-4" aria-hidden />
                      )}
                      {editable ? "Edit" : "Inspect"}
                    </ButtonLink>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
