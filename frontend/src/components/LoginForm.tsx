"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import type { Role } from "@exam/shared";
import { ApertureHero } from "@/components/brand/ApertureHero";
import { Wordmark } from "@/components/brand/VigilMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { loginRemote } from "@/lib/api";
import { authenticate, persistSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const FACTS = [
  { title: "Snapshots only", body: "When an exam uses the webcam, still frames are kept. Video is never recorded." },
  { title: "A person decides", body: "Integrity scores rank what to review. They never fail anyone on their own." },
];

/** Split sign-in screen (adapted from the 21st.dev sign-in layout). */
export function LoginForm({ role }: { role: Role }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const faculty = role === "admin";
  const idLabel = faculty ? "Faculty ID or email" : "College ID or email";

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
        : faculty
          ? "/admin"
          : "/student/upcoming",
    );
    router.refresh();
  }

  const input =
    "w-full rounded-xl border border-border bg-card px-4 py-3.5 text-sm placeholder:text-muted-foreground focus:outline-none";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground md:flex-row">
      <section className="flex flex-1 flex-col px-6 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Vigil home">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <div
              role="tablist"
              aria-label="Account type"
              className="mb-8 inline-flex rounded-full border border-border bg-card p-1 text-sm animate-in fade-in duration-500"
            >
              {(
                [
                  ["student", "Student", "/login/student"],
                  ["admin", "Faculty", "/login/admin"],
                ] as const
              ).map(([key, label, href]) => (
                <Link
                  key={key}
                  href={href}
                  role="tab"
                  aria-selected={role === key}
                  className={cn(
                    "rounded-full px-4 py-1.5",
                    role === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              ))}
            </div>

            <h1 className="text-4xl leading-tight tracking-[-0.04em] animate-in fade-in slide-in-from-bottom-2 duration-500 md:text-5xl">
              Welcome back
            </h1>
            <p className="mt-3 text-muted-foreground animate-in fade-in duration-700">
              {faculty
                ? "Sign in to build exams, monitor sessions and review evidence."
                : "Sign in with the account your college issued to see your exams."}
            </p>

            <form className="mt-8 space-y-5" onSubmit={onSubmit}>
              <label className="block text-sm">
                <span className="font-medium text-muted-foreground">{idLabel}</span>
                <input
                  className={cn(input, "mt-1.5")}
                  autoComplete="username"
                  placeholder={faculty ? "FAC001 or name@college.edu" : "STU001 or name@college.edu"}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-muted-foreground">Password</span>
                <span className="relative mt-1.5 block">
                  <input
                    className={cn(input, "pr-12")}
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-2 grid w-9 place-items-center text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </span>
              </label>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Accounts are issued by your institution.</span>
                <button
                  type="button"
                  className="shrink-0 font-medium underline-offset-4 hover:underline"
                  onClick={() =>
                    setNotice("Ask your exam office to reset your password. A reset link goes to your college email.")
                  }
                >
                  Reset password
                </button>
              </div>

              {error ? (
                <p className="rounded-xl bg-[var(--risk-high-bg)] px-4 py-3 text-sm text-[var(--risk-high-fg)]" role="alert">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground" role="status">
                  {notice}
                </p>
              ) : null}

              <Button type="submit" size="lg" loading={busy} className="w-full">
                Sign in
              </Button>
            </form>

            {faculty ? (
              <Link
                href="/demo"
                className="mt-4 flex items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-medium hover:bg-muted"
              >
                Watch the recorded demo
              </Link>
            ) : null}

            <details className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
              <summary className="cursor-pointer font-medium text-foreground">Demo accounts</summary>
              <p className="mt-2">Password for every demo account: password</p>
              <p className="mt-1">Students STU001 – STU008 · Faculty FAC001, FAC002</p>
            </details>

            <p className="mt-6 text-xs text-muted-foreground">
              Signing in confirms you hold valid credentials. It does not confirm who is at the keyboard; exams that need
              that use webcam proctoring.
            </p>
            <Link href="/" className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" aria-hidden />
              Back to home
            </Link>
          </div>
        </div>
      </section>

      <section className="relative hidden flex-1 p-4 md:block" aria-hidden>
        <div
          data-theme="dark"
          className="exam-room absolute inset-4 flex flex-col justify-between overflow-hidden rounded-3xl p-10 animate-in fade-in slide-in-from-right-4 duration-700"
        >
          <p className="max-w-xs text-2xl leading-snug tracking-[-0.03em]">
            Fair exams,
            <br />
            verified calmly.
          </p>
          <ApertureHero chips={false} className="max-w-xl" />
          <div className="grid gap-3 lg:grid-cols-2">
            {FACTS.map((fact) => (
              <div key={fact.title} className="rounded-2xl border border-border bg-card/70 p-5">
                <p className="text-sm font-medium">{fact.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{fact.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
