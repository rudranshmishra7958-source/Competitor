"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ExamForm } from "@/components/ExamForm";
import { PageHeader } from "@/components/PageHeader";
import { canEditExam, getExam, questionsForExam } from "@/lib/exam-store";
import type { Exam, Question } from "@exam/shared";

export default function EditExamPage() {
  const params = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const found = getExam(params.id);
    setExam(found ?? null);
    if (found) setQuestions(questionsForExam(found));
  }, [params.id]);

  if (!exam) {
    return <p className="text-sm text-muted-foreground">Exam not found in this browser store.</p>;
  }

  const editable = canEditExam(exam);
  return (
    <>
      <PageHeader
        title={editable ? "Edit exam" : "Inspect exam"}
        description={
          editable
            ? "Changes are saved locally until Phase 6."
            : "This exam has started. Fields are read-only."
        }
      />
      <ExamForm initial={exam} initialQuestions={questions} readOnly={!editable} />
    </>
  );
}
