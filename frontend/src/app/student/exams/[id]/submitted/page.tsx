"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { getAttempt, getExam, questionsForExam, submissionsForStudent } from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import type { WrittenSubmission } from "@exam/shared";

export default function SubmittedPage() {
  const params = useParams<{ id: string }>();
  const [title, setTitle] = useState("Exam");
  const [when, setWhen] = useState<string | null>(null);
  const [scans, setScans] = useState<WrittenSubmission[]>([]);
  const [hasWritten, setHasWritten] = useState(false);

  useEffect(() => {
    const exam = getExam(params.id);
    const session = readClientSession();
    if (exam) {
      setTitle(exam.title);
      setHasWritten(questionsForExam(exam).some((q) => q.kind === "written"));
    }
    if (exam && session) {
      const attempt = getAttempt(exam.id, session.userId);
      setWhen(attempt?.submittedAt ?? null);
      setScans(submissionsForStudent(exam.id, session.userId));
    }
  }, [params.id]);

  return (
    <>
      <PageHeader title="Submitted" description="MCQ answers are locked. Written scans stay as an append-only history." />
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-[var(--muted)]">
          {when ? `MCQ recorded at ${new Date(when).toLocaleString()}` : "Attempt recorded in this browser."}
        </p>
        {scans.length ? (
          <p className="mt-2 text-[var(--muted)]">{scans.length} written scan(s) kept in your history.</p>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col gap-2 text-sm">
        {hasWritten ? (
          <Link href={`/student/exams/${params.id}/written`} className="text-[var(--accent)] underline">
            View or add written scans
          </Link>
        ) : null}
        <Link href="/student/past" className="text-[var(--accent)] underline">
          View past exams
        </Link>
      </div>
    </>
  );
}
