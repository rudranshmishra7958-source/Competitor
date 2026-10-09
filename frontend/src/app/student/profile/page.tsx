"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, IdCard, Mail } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { readClientSession } from "@/lib/session";
import type { SessionPayload } from "@exam/shared";

export default function ProfilePage() {
  const [session, setSession] = useState<SessionPayload | null>(null);

  useEffect(() => {
    setSession(readClientSession());
  }, []);

  const rows = [
    { label: "Name", value: session?.displayName, Icon: BadgeCheck },
    { label: "College ID", value: session?.institutionalId, Icon: IdCard },
    { label: "College email", value: session?.email, Icon: Mail },
  ];

  return (
    <>
      <PageHeader title="Profile" description="Institution-issued identity on this account." />
      <Card as="section" className="max-w-md">
        <dl className="space-y-4 text-sm">
          {rows.map(({ label, value, Icon }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="text-[var(--muted)]">{label}</dt>
                <dd className="truncate font-medium">{value ?? "—"}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
