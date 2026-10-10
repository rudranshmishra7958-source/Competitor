"use client";

import { useEffect, useState } from "react";
import { ChartColumn, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  examStatus,
  getAttempt,
  gradeAttempt,
  loadStore,
  questionsForExam,
  submissionsForStudent,
} from "@/lib/exam-store";
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
        <ul className="grid gap-3">
          {exams.map((exam) => {
            const hasWritten = questionsForExam(exam).some((q) => q.kind === "written");
            const attempt = userId ? getAttempt(exam.id, userId) : undefined;
            const result = attempt?.submittedAt ? gradeAttempt(exam, attempt.id) : null;
            return (
              <Card as="li" key={exam.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="font-medium">{exam.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {exam.startsAt ? new Date(exam.startsAt).toLocaleString() : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                {result && result.gradable > 0 ? (
                  <Badge tone={result.percent >= 50 ? "low" : "high"}>
                    {result.correct}/{result.gradable} · {result.percent}%
                  </Badge>
                ) : !attempt ? (
                  <Badge>Not attempted</Badge>
                ) : null}
                {result ? (
                  <ButtonLink href={`/student/exams/${exam.id}/submitted`} variant="secondary" size="sm">
                    <ChartColumn className="size-4" aria-hidden />
                    Result
                  </ButtonLink>
                ) : null}
                {hasWritten && userId ? (
                  <ButtonLink href={`/student/exams/${exam.id}/written`} variant="secondary" size="sm">
                    <ScanLine className="size-4" aria-hidden />
                    Scan history
                  </ButtonLink>
                ) : null}
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </>
  );
}
