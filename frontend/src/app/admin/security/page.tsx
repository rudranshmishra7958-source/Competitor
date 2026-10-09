"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import type { SecurityAlert } from "@exam/shared";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { fetchSecurityAlerts } from "@/lib/api";

export default function SecurityPage() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetchSecurityAlerts().then((rows) => {
      setAlerts(rows ?? []);
      setLoaded(true);
    });
  }, []);

  return (
    <>
      <PageHeader
        title="Account security"
        description="Login failures, lockouts, and revoked-session signals. Passwords are never logged."
      />
      {loaded && alerts.length === 0 ? (
        <EmptyState>No suspicious login signals.</EmptyState>
      ) : (
        <ul className="grid gap-3">
          {alerts.map((alert) => (
            <Card as="li" key={alert.id} className="flex items-start gap-3 text-sm">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]">
                <ShieldAlert className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium capitalize">{alert.event.replaceAll("_", " ")}</span>
                  <time className="text-xs text-[var(--muted)]">
                    {new Date(alert.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Account {alert.identifierHint}
                  {alert.ipAddress ? ` · ${alert.ipAddress}` : ""}
                </p>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </>
  );
}
