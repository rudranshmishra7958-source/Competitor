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
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-baseline justify-between gap-6 border-b border-border pb-3 last:border-0 last:pb-0">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="truncate font-medium">{value ?? "—"}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </>
  );
}
