"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  FileText,
  GraduationCap,
  History,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Radar,
  ShieldCheck,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Role, SessionPayload } from "@exam/shared";
import { SkipLink } from "@/components/SkipLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cx } from "@/components/ui/cx";
import { clearSession, readClientSession } from "@/lib/session";
import { logoutRemote } from "@/lib/api";

type NavItem = { href: string; label: string };

const ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/exams": FileText,
  "/admin/students": Users,
  "/admin/live": Radar,
  "/admin/reports": BarChart3,
  "/admin/security": ShieldCheck,
  "/student/upcoming": CalendarClock,
  "/student/past": History,
  "/student/profile": User,
};

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
  const [drawerPath, setDrawerPath] = useState<string | null>(null);
  const drawer = drawerPath === pathname;
  const setDrawer = (open: boolean) => setDrawerPath(open ? pathname : null);

  useEffect(() => {
    setSession(readClientSession());
  }, []);

  async function logout() {
    await logoutRemote();
    clearSession();
    router.push("/");
  }

  const focusMode = pathname.includes("/student/exams/");
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  const navList = (
    <ul className="space-y-1">
      {nav.map((item) => {
        const active = isActive(item.href);
        const Icon = ICONS[item.href] ?? FileText;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium",
                active
                  ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)] shadow-[inset_3px_0_0_var(--accent)]"
                  : "text-[var(--foreground)] hover:bg-[var(--nav-active-bg)]",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-full">
      <SkipLink />
      <header className="glass-strong sticky top-0 z-30 rounded-none border-x-0 border-t-0">
        <div
          className={cx(
            "mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6",
            focusMode ? "max-w-4xl" : "max-w-7xl",
          )}
        >
          <div className="flex items-center gap-3">
            {!focusMode ? (
              <button
                type="button"
                className="glass grid size-10 place-items-center rounded-xl lg:hidden"
                aria-label="Open navigation"
                aria-expanded={drawer}
                onClick={() => setDrawer(true)}
              >
                <Menu className="size-5" aria-hidden />
              </button>
            ) : null}
            <span
              className="btn-grad grid size-9 place-items-center rounded-xl"
              aria-hidden
            >
              <GraduationCap className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight sm:text-base">
                Secure Examination Platform
              </p>
              <p className="text-xs text-[var(--muted)]">
                {role === "admin" ? "Proctor portal" : "Student portal"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="hidden max-w-40 truncate text-sm text-[var(--muted)] md:block">
              {session?.displayName ?? "…"}
            </p>
            <ThemeToggle />
            <Link
              href="/change-password"
              aria-label="Change password"
              title="Change password"
              className="glass grid size-10 place-items-center rounded-xl hover:border-[var(--accent)]"
            >
              <KeyRound className="size-5" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={logout}
              className="glass inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium hover:border-[var(--accent)]"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawer(false)}
            aria-hidden
          />
          <div className="glass-strong rise absolute inset-y-0 left-0 w-72 max-w-[85vw] rounded-none p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Menu</p>
              <button
                type="button"
                className="grid size-10 place-items-center rounded-xl hover:bg-[var(--nav-active-bg)]"
                aria-label="Close navigation"
                onClick={() => setDrawer(false)}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <nav aria-label="Primary">{navList}</nav>
          </div>
        </div>
      ) : null}

      <div
        className={cx(
          "mx-auto flex gap-8 px-4 py-6 sm:px-6 sm:py-8",
          focusMode ? "max-w-4xl" : "max-w-7xl",
        )}
      >
        {!focusMode ? (
          <nav aria-label="Primary" className="hidden w-56 shrink-0 lg:block">
            <div className="glass sticky top-24 rounded-2xl p-2">{navList}</div>
          </nav>
        ) : null}
        <main id="main" className="rise min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
