"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Clock, Laptop, Lock, ShieldCheck, Video } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  examFormatLabel,
  examStatus,
  getAttempt,
  loadStore,
  questionsForExam,
} from "@/lib/exam-store";
import { readClientSession } from "@/lib/session";
import type { Exam } from "@exam/shared";

export default function UpcomingExamsPage() {
  const [exams, setExams] = useState<Exam[] | null>(null);

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
      {exams === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState>No upcoming exams.</EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {exams.map((exam) => {
            const status = examStatus(exam);
            const live = status === "live";
            const started = Boolean(getAttempt(exam.id, readClientSession()?.userId ?? ""));
            return (
              <Card as="li" key={exam.id} interactive className="flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold leading-snug">{exam.title}</h2>
                  <Badge tone={live ? "low" : "accent"} className="shrink-0">
                    {live ? "Open now" : status === "scheduled" && exam.startsAt
                      ? `Opens ${new Date(exam.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`
                      : status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {examFormatLabel(exam)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge icon={<Clock className="size-3.5" aria-hidden />}>
                    {exam.durationMinutes} min
                  </Badge>
                  <Badge
                    icon={
                      exam.policy.requireEndpointAgent ? (
                        <ShieldCheck className="size-3.5" aria-hidden />
                      ) : (
                        <Laptop className="size-3.5" aria-hidden />
                      )
                    }
                  >
                    {exam.policy.requireEndpointAgent ? "Agent required" : "Browser only"}
                  </Badge>
                  {exam.policy.webcam?.required ? (
                    <Badge tone="medium" icon={<Video className="size-3.5" aria-hidden />}>
                      Webcam required
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-5 pt-1">
                  {live ? (
                    <ButtonLink href={`/student/exams/${exam.id}/precheck`} className="w-full sm:w-auto">
                      {started ? "Continue" : "Start"}
                      <ArrowRight className="size-4" aria-hidden />
                    </ButtonLink>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-sm text-[var(--muted)]">
                      <Lock className="size-4" aria-hidden />
                      Not open yet
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </ul>
      )}
    </>
  );
}
