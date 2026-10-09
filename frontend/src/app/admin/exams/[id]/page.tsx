"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ExamForm } from "@/components/ExamForm";
import { PageHeader } from "@/components/PageHeader";
import { getExam, loadStore, questionsForExam, studentRoster } from "@/lib/exam-store";
import type { Exam, Question, WrittenSubmission } from "@exam/shared";

export default function InspectExamPage() {
  const params = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scans, setScans] = useState<WrittenSubmission[]>([]);

  useEffect(() => {
    const found = getExam(params.id);
    setExam(found ?? null);
    if (found) {
      setQuestions(questionsForExam(found));
      setScans(loadStore().submissions.filter((s) => s.examId === found.id));
    }
  }, [params.id]);

  if (!exam) {
    return <p className="glass rounded-2xl p-6 text-sm text-[var(--muted)]">Exam not found in this browser store.</p>;
  }

  return (
    <>
      <PageHeader title="Inspect exam" description="Read-only view of a live or completed exam." />
      <ExamForm initial={exam} initialQuestions={questions} readOnly />
      {scans.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Written scans (append-only)</h2>
          <ul className="mt-3 space-y-3">
            {scans.map((s) => {
              const who = studentRoster().find((r) => r.userId === s.studentId);
              return (
                <li key={s.id} className="text-sm">
                  <p className="text-[var(--muted)]">
                    {who?.displayName ?? s.studentId} · {new Date(s.createdAt).toLocaleString()}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.imageUrl} alt="Student written scan" className="mt-1 max-h-40 rounded-xl border border-[var(--border)]" />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
