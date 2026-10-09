"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { Role } from "@exam/shared";
import { authenticate, persistSession } from "@/lib/session";
import { loginRemote } from "@/lib/api";

const IDENTITY_CAVEAT =
  "This login confirms you have valid institution credentials. It does not verify that the enrolled person is physically present.";

export function LoginForm({ role }: { role: Role }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const idLabel = role === "admin" ? "Faculty ID or faculty email" : "College ID or college email";
  const heading = role === "admin" ? "Faculty / admin sign in" : "Student sign in";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const remote = await loginRemote(identifier, password, role);
    if (remote.kind === "rejected") {
      setError(remote.message);
      return;
    }
    const session =
      remote.kind === "ok"
        ? { ...remote.user, mustResetPassword: remote.mustResetPassword }
        : authenticate(identifier, password, role);
    if (!session) {
      setError("Invalid credentials.");
      return;
    }
    persistSession(session);
    router.push(
      session.mustResetPassword
        ? "/change-password?required=1"
        : role === "admin"
          ? "/admin"
          : "/student/upcoming",
    );
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
        Secure Examination Platform
      </p>
      <h1 className="mt-2 text-2xl font-semibold">{heading}</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">{IDENTITY_CAVEAT}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Accounts are provisioned by the institution. There is no self-registration.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block text-sm">
          <span className="font-medium">{idLabel}</span>
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Password</span>
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="text-sm text-[var(--risk-high-fg)]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="w-full rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Sign in
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <button
          type="button"
          className="text-left text-[var(--accent)] underline-offset-2 hover:underline"
          onClick={() =>
            setNotice("Password reset on first login will be available when the server is connected.")
          }
        >
          First-time login? Reset password
        </button>
        <button
          type="button"
          className="text-left text-[var(--accent)] underline-offset-2 hover:underline"
          onClick={() =>
            setNotice("Forgot password is sent to your college email once the server is connected.")
          }
        >
          Forgot password
        </button>
      </div>
      {notice ? (
        <p className="mt-3 rounded-md bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)]">
          {notice}
        </p>
      ) : null}

      <p className="mt-6 text-xs text-[var(--muted)]">
        Demo accounts — student: STU001 or student@college.edu / password · faculty: FAC001 or
        faculty@college.edu / password
      </p>
      <Link
        href="/"
        className="mt-4 inline-block text-sm text-[var(--accent)] underline-offset-2 hover:underline"
      >
        Back to portal choice
      </Link>
    </div>
  );
}
