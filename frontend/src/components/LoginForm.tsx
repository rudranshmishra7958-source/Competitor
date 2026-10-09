"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const idLabel = role === "admin" ? "Faculty ID or faculty email" : "College ID or college email";
  const heading = role === "admin" ? "Faculty / admin sign in" : "Student sign in";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const remote = await loginRemote(identifier, password, role);
    setBusy(false);
    if (remote.kind === "rejected") {
      setError(remote.message);
      return;
    }
    // The offline mock login is a demo convenience only; it must be opted into.
    const offlineDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
    if (remote.kind === "unavailable" && !offlineDemo) {
      setError("The server is unavailable. Start the API and try again.");
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

  const field =
    "mt-1.5 w-full min-h-11 rounded-xl border border-[var(--border)] px-3.5 py-2.5";
  const link = "text-left text-[var(--nav-active-fg)] underline-offset-2 hover:underline";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-strong rise w-full max-w-md rounded-3xl p-6 sm:p-8">
        <span className="btn-grad grid size-12 place-items-center rounded-2xl" aria-hidden>
          <LogIn className="size-6" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--nav-active-fg)]">
          Secure Examination Platform
        </p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{heading}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">{IDENTITY_CAVEAT}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Accounts are provisioned by the institution. There is no self-registration.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm">
            <span className="font-medium">{idLabel}</span>
            <input
              className={field}
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Password</span>
            <div className="relative">
              <input
                className={`${field} pr-12`}
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-[0.4rem] grid size-9 place-items-center rounded-lg text-[var(--muted)] hover:bg-[var(--nav-active-bg)]"
              >
                {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </label>
          {error ? (
            <p
              className="rounded-xl bg-[var(--risk-high-bg)] px-3 py-2 text-sm text-[var(--risk-high-fg)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" loading={busy} className="w-full">
            Sign in
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-sm">
          <button
            type="button"
            className={link}
            onClick={() =>
              setNotice("Password reset on first login will be available when the server is connected.")
            }
          >
            First-time login? Reset password
          </button>
          <button
            type="button"
            className={link}
            onClick={() =>
              setNotice("Forgot password is sent to your college email once the server is connected.")
            }
          >
            Forgot password
          </button>
        </div>
        {notice ? (
          <p className="mt-3 rounded-xl bg-[var(--nav-active-bg)] px-3 py-2 text-sm text-[var(--muted)]">
            {notice}
          </p>
        ) : null}

        <details className="mt-6 rounded-xl bg-[var(--nav-active-bg)] px-3 py-2 text-xs text-[var(--muted)]">
          <summary className="cursor-pointer font-medium text-[var(--foreground)]">
            Demo accounts
          </summary>
          <p className="mt-2">Password for every demo account: password</p>
          <p className="mt-1">Students: STU001 – STU008 (e.g. student@college.edu)</p>
          <p className="mt-1">Faculty / proctors: FAC001, FAC002 (faculty@college.edu, proctor@college.edu)</p>
        </details>
        <Link
          href="/"
          className="mt-5 inline-flex items-center gap-1 text-sm text-[var(--nav-active-fg)] underline-offset-2 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to portal choice
        </Link>
      </div>
    </div>
  );
}
