"use client";

import { useEffect, useState } from "react";
import type { SecurityAlert } from "@exam/shared";
import { EmptyState, PageHeader } from "@/components/PageHeader";
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
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {alerts.map((alert) => (
            <li key={alert.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{alert.event.replaceAll("_", " ")}</span>
                <time className="text-xs text-[var(--muted)]">
                  {new Date(alert.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Account {alert.identifierHint}
                {alert.ipAddress ? ` · ${alert.ipAddress}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
