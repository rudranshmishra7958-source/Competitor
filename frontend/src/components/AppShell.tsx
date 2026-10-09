"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Role, SessionPayload } from "@exam/shared";
import { SkipLink } from "@/components/SkipLink";
import { clearSession, readClientSession } from "@/lib/session";
import { logoutRemote } from "@/lib/api";

type NavItem = { href: string; label: string };

export function AppShell({
  role,
  nav,
  children,
}: {
  role: Role;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);

  useEffect(() => {
    setSession(readClientSession());
  }, []);

  async function logout() {
    await logoutRemote();
    clearSession();
    router.push("/");
  }

  const hideNav = pathname.includes("/student/exams/");

  return (
    <div className="min-h-full">
      <SkipLink />
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div>
            <p className="text-base font-semibold tracking-tight text-[var(--foreground)]">
              Secure Examination Platform
            </p>
            <p className="mt-1">
              <span className="rounded-full bg-[var(--exam-bg)] px-2 py-0.5 text-xs font-medium capitalize text-[var(--cyan)]">
                {role === "admin" ? "Proctor" : "Student"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-[var(--muted)]">
              {session?.displayName ?? "…"}
            </p>
            <Link
              href="/change-password"
              className="text-xs text-[var(--accent)] underline-offset-2 hover:underline"
            >
              Change password
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--background)]"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className={`mx-auto flex gap-8 px-6 py-8 ${hideNav ? "max-w-4xl" : "max-w-6xl"}`}>
        {!hideNav ? (
        <nav aria-label="Primary" className="w-48 shrink-0">
          <ul className="space-y-1">
            {nav.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-md px-3 py-2 text-sm font-medium ${
                      active
                        ? "bg-[var(--exam-bg)] text-[var(--cyan)]"
                        : "text-[var(--foreground)] hover:bg-[var(--surface)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        ) : null}
        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
