"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { readClientSession } from "@/lib/session";
import type { SessionPayload } from "@exam/shared";

export default function ProfilePage() {
  const [session, setSession] = useState<SessionPayload | null>(null);

  useEffect(() => {
    setSession(readClientSession());
  }, []);

  return (
    <>
      <PageHeader title="Profile" description="Institution-issued identity on this account." />
      <dl className="max-w-md space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Name</dt>
          <dd className="font-medium">{session?.displayName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">College ID</dt>
          <dd className="font-medium">{session?.institutionalId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">College email</dt>
          <dd className="font-medium">{session?.email ?? "—"}</dd>
        </div>
      </dl>
    </>
  );
}
