import { PageHeader } from "@/components/PageHeader";
import { studentRoster } from "@/lib/exam-store";

export default function AdminStudentsPage() {
  const students = studentRoster();
  return (
    <>
      <PageHeader
        title="Students"
        description="Provisioned accounts only — bulk import arrives with the backend."
      />
      <table className="w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-left text-sm">
        <thead className="bg-[var(--background)] text-[var(--muted)]">
          <tr>
            <th className="px-4 py-2 font-medium">College ID</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Email</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.userId} className="border-t border-[var(--border)]">
              <td className="px-4 py-2">{s.institutionalId}</td>
              <td className="px-4 py-2">{s.displayName}</td>
              <td className="px-4 py-2">{s.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Demo login: STU001 / student@college.edu or STU002 / kabir@college.edu — password
        `password`.
      </p>
    </>
  );
}
