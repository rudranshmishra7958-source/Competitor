import { PageHeader } from "@/components/PageHeader";
import { TableWrap, td, th } from "@/components/ui/Table";
import { studentRoster } from "@/lib/exam-store";

export default function AdminStudentsPage() {
  const students = studentRoster();
  return (
    <>
      <PageHeader
        title="Students"
        description="Provisioned accounts only — bulk import arrives with the backend."
      />
      <TableWrap caption="Provisioned students" className="max-w-4xl">
        <thead>
          <tr>
            <th scope="col" className={th}>College ID</th>
            <th scope="col" className={th}>Name</th>
            <th scope="col" className={th}>Email</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.userId} className="hover:bg-[var(--nav-active-bg)]">
              <td className={`${td} font-mono text-xs`}>{s.institutionalId}</td>
              <td className={`${td} font-medium`}>{s.displayName}</td>
              <td className={td}>{s.email}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p className="mt-3 text-xs text-[var(--muted)]">
        Demo logins: any college ID above (STU001 – STU008) or its email, password `password`.
      </p>
    </>
  );
}
