"use client";

import { useState } from "react";
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
    <div className="text-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-md border border-[var(--cyan)] px-3 py-1 text-[var(--cyan)]"
      >
        {open ? "Hide agent setup" : "Connect agent"}
      </button>
      {open ? (
        <div className="mt-3 max-w-xl text-[var(--text-muted)]">
          <p>
            {required ? "This exam requires the agent before you can answer." : "Optional. Connecting raises assurance."}{" "}
            {connected ? "The agent is connected." : "The agent is not connected yet."}
          </p>
          <p className="mt-2">
            It reports the foreground program name, display count, and network state. It does not read titles, keys, or screenshots.
          </p>
          <button
            type="button"
            onClick={copyCommand}
            className="mt-3 rounded-md bg-[var(--cyan)] px-3 py-1.5 font-medium text-[var(--exam-bg)]"
          >
            Copy PowerShell launch command
          </button>
          {message ? <p className="mt-2 text-[var(--cyan)]">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
