"use client";

import { useState } from "react";
import { Copy, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { createAgentToken } from "@/lib/api";

export function AgentSetup({
  sessionId,
  examId,
  studentId,
  required,
  connected,
}: {
  sessionId: string;
  examId: string;
  studentId: string;
  required: boolean;
  connected: boolean;
}) {
  const [open, setOpen] = useState(required);
  const [message, setMessage] = useState("");

  async function copyCommand() {
    setMessage("Creating a short-lived agent token…");
    const token = await createAgentToken(sessionId);
    if (!token) {
      setMessage("The API must be running, and you must be logged in as the student.");
      return;
    }
    const command = [
      `cd "${"C:\\Users\\rudra\\OneDrive\\Desktop\\Competitor\\agent"}"`,
      `if (Test-Path .\\.venv\\Scripts\\python.exe) { $py = ".\\.venv\\Scripts\\python.exe" } else { $py = "py" }`,
      `& $py status.py --ws-url "ws://localhost:8000/ws/events" --exam-id "${examId}" --student-id "${studentId}" --session-id "${sessionId}" --token "${token}"`,
    ].join("; ");
    await navigator.clipboard.writeText(command);
    setMessage("PowerShell command copied. Paste it in a terminal. The token expires soon.");
  }

  return (
    <div className="surface rounded-2xl p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlugZap className="size-5 text-[var(--nav-active-fg)]" aria-hidden />
          <span className="font-medium">Endpoint agent</span>
          <Badge tone={connected ? "low" : required ? "medium" : "neutral"}>
            {connected ? "Connected" : required ? "Required" : "Optional"}
          </Badge>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Hide agent setup" : "Connect agent"}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 max-w-xl text-[var(--muted)]">
          <p>
            {required ? "This exam requires the agent before you can answer." : "Optional. Connecting raises assurance."}{" "}
            {connected ? "The agent is connected." : "The agent is not connected yet."}
          </p>
          <p className="mt-2">
            It reports the foreground program name, display count, and network state. It does not read titles, keys, or screenshots.
          </p>
          <Button size="sm" onClick={copyCommand} className="mt-3">
            <Copy className="size-4" aria-hidden />
            Copy PowerShell launch command
          </Button>
          {message ? (
            <p className="mt-2 text-[var(--nav-active-fg)]" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
