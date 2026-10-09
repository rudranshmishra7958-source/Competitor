import { PageHeader } from "@/components/PageHeader";
import { ExamForm } from "@/components/ExamForm";

export default function NewExamPage() {
  return (
    <>
      <PageHeader title="Create exam" description="Drafts stay editable until the start time." />
      <ExamForm />
    </>
  );
}
