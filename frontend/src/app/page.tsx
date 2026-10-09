import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
          Secure Examination Platform
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Choose your portal</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Use the account provisioned by your institution. Webcam capture is not required to sign
          in.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/login/student"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-6 text-left hover:border-[var(--accent)]"
          >
            <p className="font-medium">Student</p>
            <p className="mt-1 text-sm text-[var(--muted)]">College ID or college email</p>
          </Link>
          <Link
            href="/login/admin"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-6 text-left hover:border-[var(--accent)]"
          >
            <p className="font-medium">Faculty / admin</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Faculty ID or faculty email</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
