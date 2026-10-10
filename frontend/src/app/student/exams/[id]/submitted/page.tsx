"use client";

import { ArrowRight, CircleCheck, CircleX, Hourglass, ScanLine, VideoOff } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  type AttemptResult,
  getAttempt,
  getExam,
  gradeAttempt,
  questionsForExam,
  submissionsForStudent,
} from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import type { WrittenSubmission } from "@exam/shared";

function ScoreRing({ percent }: { percent: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="size-24 shrink-0" role="img" aria-label={`Score ${percent}%`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="var(--border)" strokeWidth="8" />
      <circle
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${(percent / 100) * c} ${c}`}
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="45"
        textAnchor="middle"
        fontSize="18"
        fontWeight="600"
        fill="currentColor"
      >
        {percent}%
      </text>
    </svg>
  );
}

export default function SubmittedPage() {
  const params = useParams<{ id: string }>();
  const [title, setTitle] = useState("Exam");
  const [when, setWhen] = useState<string | null>(null);
  const [scans, setScans] = useState<WrittenSubmission[]>([]);
  const [hasWritten, setHasWritten] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [webcam, setWebcam] = useState(false);

  useEffect(() => {
    const exam = getExam(params.id);
    const session = readClientSession();
    if (exam) {
      setTitle(exam.title);
      setWebcam(Boolean(exam.policy.webcam?.required));
      setHasWritten(questionsForExam(exam).some((q) => q.kind === "written"));
    }
    if (exam && session) {
      const attempt = getAttempt(exam.id, session.userId);
      setWhen(attempt?.submittedAt ?? null);
      setScans(submissionsForStudent(exam.id, session.userId));
      if (attempt) setResult(gradeAttempt(exam, attempt.id));
    }
  }, [params.id]);

  return (
    <>
      <PageHeader
        title="Submitted"
        description="Answers are locked. Written scans stay as an append-only history."
      />
      <Card strong className="flex max-w-2xl flex-wrap items-center gap-5">
        {result && result.gradable > 0 ? <ScoreRing percent={result.percent} /> : null}
        <div className="min-w-0 flex-1 text-sm">
          <p className="text-lg font-medium">{title}</p>
          {result && result.gradable > 0 ? (
            <p className="mt-1 font-medium">
              {result.correct} of {result.gradable} auto-graded questions correct
            </p>
          ) : null}
          <p className="mt-1 text-muted-foreground">
            {when ? `Submitted at ${new Date(when).toLocaleString()}` : "Attempt recorded in this browser."}
          </p>
          {result?.pendingManual ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground">
              <Hourglass className="size-4" aria-hidden />
              {result.pendingManual} written answer{result.pendingManual === 1 ? "" : "s"} awaiting
              faculty grading
            </p>
          ) : null}
          {scans.length ? (
            <p className="mt-1 text-muted-foreground">{scans.length} written scan(s) kept in your history.</p>
          ) : null}
          {webcam ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-muted-foreground">
              <VideoOff className="size-4" aria-hidden />
              Camera is off. No video was recorded; only the snapshots taken during the exam are kept for review.
            </p>
          ) : null}
        </div>
      </Card>

      {result && result.gradable > 0 ? (
        <section className="mt-8 max-w-2xl">
          <h2 className="text-lg font-medium">Question review</h2>
          <ol className="mt-3 space-y-3">
            {result.items.map((item, i) => (
              <Card as="li" key={item.question.id} className="p-4">
                <div className="flex items-start gap-3">
                  {item.correct === true ? (
                    <CircleCheck className="mt-0.5 size-5 shrink-0 text-[var(--risk-low-fg)]" aria-label="Correct" />
                  ) : item.correct === false ? (
                    <CircleX className="mt-0.5 size-5 shrink-0 text-[var(--risk-high-fg)]" aria-label="Incorrect" />
                  ) : (
                    <Hourglass className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Awaiting grading" />
                  )}
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {i + 1}. {item.question.prompt}
                    </p>
                    {item.correct === null ? (
                      <Badge className="mt-2">Graded by faculty</Badge>
                    ) : (
                      <div className="mt-2 space-y-1 text-muted-foreground">
                        <p>
                          Your answer:{" "}
                          <span className="text-foreground">{item.given || "No answer"}</span>
                        </p>
                        {item.correct === false ? (
                          <p>
                            Correct answer:{" "}
                            <span className="text-[var(--risk-low-fg)]">{item.expected}</span>
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {hasWritten ? (
          <ButtonLink href={`/student/exams/${params.id}/written`} variant="secondary">
            <ScanLine className="size-4" aria-hidden />
            View or add written scans
          </ButtonLink>
        ) : null}
        <ButtonLink href="/student/past">
          View past exams
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    </>
  );
}
