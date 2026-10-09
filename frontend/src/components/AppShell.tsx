"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  FileText,
  History,
  LayoutDashboard,
  Menu,
  Radar,
  ShieldCheck,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Role, SessionPayload } from "@exam/shared";
import { Wordmark } from "@/components/brand/VigilMark";
import { SkipLink } from "@/components/SkipLink";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
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

function initials(name: string | undefined): string {
  if (!name) return "·";
  return name
    .split(/\s+/)
    .filter((part) => /[A-Za-z]/.test(part[0] ?? ""))
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

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
  const [menuOpen, setMenuOpen] = useState(false);
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
    <ul className="space-y-0.5">
      {nav.map((item) => {
        const active = isActive(item.href);
        const Icon = ICONS[item.href] ?? FileText;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm",
                active
                  ? "bg-card font-medium text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {active ? <span className="size-1.5 rounded-full bg-[var(--sage)]" aria-hidden /> : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="min-h-full">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div
          className={cn(
            "mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:px-6",
            focusMode ? "max-w-4xl" : "max-w-7xl",
          )}
        >
          <div className="flex items-center gap-3">
            {!focusMode ? (
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full border border-border lg:hidden"
                aria-label="Open navigation"
                aria-expanded={drawer}
                onClick={() => setDrawer(true)}
              >
                <Menu className="size-4" aria-hidden />
              </button>
            ) : null}
            <Link href={role === "admin" ? "/admin" : "/student/upcoming"} aria-label="Vigil home">
              <Wordmark />
            </Link>
            <span className="hidden rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground sm:inline">
              {role === "admin" ? "Faculty" : "Student"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm hover:bg-muted"
              >
                <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-medium text-primary-foreground">
                  {initials(session?.displayName)}
                </span>
                <span className="hidden max-w-36 truncate md:inline">{session?.displayName ?? "…"}</span>
              </button>
              {menuOpen ? (
                <>
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-border bg-card p-1.5 text-sm shadow-[var(--shadow-float)] animate-in fade-in zoom-in-95 duration-150"
                  >
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      {session?.institutionalId ?? ""} · {session?.email ?? ""}
                    </p>
                    <Link
                      role="menuitem"
                      href="/change-password"
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg px-3 py-2 hover:bg-muted"
                    >
                      Change password
                    </Link>
                    <button
                      role="menuitem"
                      type="button"
                      onClick={logout}
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted"
                    >
                      Log out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {drawer ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawer(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-border bg-background p-4 animate-in slide-in-from-left duration-200">
            <div className="mb-6 flex items-center justify-between">
              <Wordmark />
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full hover:bg-muted"
                aria-label="Close navigation"
                onClick={() => setDrawer(false)}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <nav aria-label="Primary">{navList}</nav>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto flex gap-10 px-4 py-8 sm:px-6 sm:py-10",
          focusMode ? "max-w-4xl" : "max-w-7xl",
        )}
      >
        {!focusMode ? (
          <nav aria-label="Primary" className="hidden w-52 shrink-0 lg:block">
            <div className="sticky top-24">{navList}</div>
          </nav>
        ) : null}
        <main id="main" className="rise min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
