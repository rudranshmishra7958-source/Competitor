# Phase 9 endpoint agent

A small Windows-first development agent with an always-visible Tkinter status and privacy
window. It sends events to the examination WebSocket with `source: "endpoint"`.

This is a development runner only. It does not include an installer, service, code signing,
auto-start, or background-only mode.

## Privacy boundary

The agent reports:

- foreground **executable name only**, resolved from the foreground process ID with Windows
  APIs and `psutil`;
- Windows online/offline state changes;
- display count and monitor resolutions when Windows exposes them;
- agent start, stop, and heartbeat events.

It never requests or reports window titles, URLs, page content, screenshots, keystrokes,
clipboard data, files, or process command lines. Paths returned by operating-system APIs are
reduced to a bounded basename before use.

Session lock/unlock collection is intentionally omitted from this development build. Safe
Windows session notifications require owning and subclassing a native window procedure;
polling or inferring lock state would be less reliable and could broaden collection.

The status window shows this disclosure while monitoring is active. Closing the window stops
the agent.

## Install and run (PowerShell)

Python 3.11 or newer is recommended. Standard Windows Python includes Tkinter.

```powershell
cd C:\Users\rudra\OneDrive\Desktop\Competitor\agent
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

$env:INGEST_WS_URL = "ws://localhost:8000/ws/events"
$env:AGENT_EXAM_ID = "exam-001"
$env:AGENT_STUDENT_ID = "student-001"
$env:AGENT_SESSION_ID = "session-001"
$env:AGENT_TOKEN = "<access-token>"
.\.venv\Scripts\python.exe status.py
```

All required values can instead be passed explicitly:

```powershell
.\.venv\Scripts\python.exe status.py `
  --ws-url ws://localhost:8000/ws/events `
  --exam-id exam-001 `
  --student-id student-001 `
  --session-id session-001 `
  --token "<access-token>"
```

For routine use, prefer environment variables or a locally protected JSON file so the token
does not appear in shell history. Example `agent-config.json`:

```json
{
  "ws_url": "ws://localhost:8000/ws/events",
  "exam_id": "exam-001",
  "student_id": "student-001",
  "session_id": "session-001",
  "token": "<access-token>",
  "queue_capacity": 256,
  "heartbeat_seconds": 30
}
```

Run it with:

```powershell
.\.venv\Scripts\python.exe status.py --config .\agent-config.json
```

CLI values override JSON values, which override environment variables. The WebSocket URL
defaults to `ws://localhost:8000/ws/events`; the four identity/token values are required.
The token is sent only in the `Authorization: Bearer ...` handshake header and is redacted
from connection errors. The agent does not log configuration or tokens.

## Delivery behavior

Events enter a bounded in-memory FIFO (256 by default). Duplicate pending state events are
coalesced. When full, the oldest pending event is dropped. An event remains at the queue head
until the server acknowledges it, so connection failures do not silently consume queued
events. Reconnect delay doubles from one second up to 30 seconds.

The queue is intentionally memory-only and disappears when the process exits.

## Tests

```powershell
cd C:\Users\rudra\OneDrive\Desktop\Competitor\agent
.\.venv\Scripts\python.exe -m pytest
```
