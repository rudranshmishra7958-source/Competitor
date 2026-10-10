"use client";

import { useEffect, useState } from "react";
import type { SecurityAlert } from "@exam/shared";
import { EmptyState, PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { sentence } from "@/lib/utils";
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
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{sentence(alert.event.replaceAll("_", " "))}</span>
                  <time className="text-xs text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
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
