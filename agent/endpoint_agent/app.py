"""Tkinter UI and endpoint-agent lifecycle orchestration."""

from __future__ import annotations

import platform
from queue import Empty, Queue
from threading import Event, Thread
import tkinter as tk
from tkinter import ttk
from typing import Any

from . import __version__
from .collectors import CollectorService
from .config import AgentConfig, parse_config
from .events import EventBuffer, EventIdentity
from .transport import WebSocketTransport

PRIVACY_DISCLOSURE = (
    "Reports only: foreground executable name, connectivity changes, display count and "
    "resolutions, plus agent lifecycle and heartbeat.\n\n"
    "Never collects: window titles, URLs, page content, screenshots, keystrokes, files, "
    "clipboard data, or command lines.\n\n"
    "Session lock/unlock is not collected in this development build."
)


class AgentRuntime:
    def __init__(self, config: AgentConfig, ui_messages: Queue[tuple[str, str]]) -> None:
        self._config = config
        self._ui_messages = ui_messages
        self._identity = EventIdentity(config.exam_id, config.student_id, config.session_id)
        self._buffer = EventBuffer(config.queue_capacity)
        self._collectors = CollectorService(self.emit)
        self._transport = WebSocketTransport(
            config.ws_url,
            config.token,
            self._buffer,
            self._on_transport_status,
        )
        self._heartbeat_stop = Event()
        self._heartbeat_thread = Thread(
            target=self._heartbeat_loop,
            name="agent-heartbeat",
            daemon=True,
        )

    def start(self) -> None:
        self.emit(
            "agent_started",
            {
                "agentVersion": __version__,
                "platform": "Windows",
                "sessionLockMonitoring": False,
            },
        )
        self._transport.start()
        self._collectors.start()
        self._heartbeat_thread.start()

    def stop(self) -> None:
        self._collectors.stop()
        self._heartbeat_stop.set()
        self._heartbeat_thread.join(timeout=2)
        self.emit("agent_stopped", {"reason": "user_closed_status_window"})
        self._buffer.wait_until_empty(timeout=1.5)
        self._transport.stop()

    def emit(self, event_type: str, metadata: dict[str, Any]) -> None:
        self._buffer.put(self._identity.build(event_type, metadata))
        self._publish_queue_status()

    def _heartbeat_loop(self) -> None:
        while not self._heartbeat_stop.wait(self._config.heartbeat_seconds):
            self.emit(
                "agent_heartbeat",
                {
                    "agentVersion": __version__,
                    "queuedEvents": len(self._buffer),
                },
            )

    def _on_transport_status(self, state: str, detail: str) -> None:
        self._ui_messages.put(("connection", state.capitalize()))
        self._ui_messages.put(("detail", detail))
        self._publish_queue_status()

    def _publish_queue_status(self) -> None:
        value = f"{len(self._buffer)} queued"
        if self._buffer.dropped_count:
            value += f" ({self._buffer.dropped_count} oldest dropped)"
        self._ui_messages.put(("queue", value))


class StatusWindow:
    def __init__(self, config: AgentConfig) -> None:
        self._root = tk.Tk()
        self._root.title("Examination Endpoint Agent")
        self._root.geometry("620x470")
        self._root.minsize(560, 420)
        self._messages: Queue[tuple[str, str]] = Queue()
        self._runtime = AgentRuntime(config, self._messages)
        self._closing = False

        self._connection = tk.StringVar(value="Starting")
        self._detail = tk.StringVar(value="")
        self._queue = tk.StringVar(value="0 queued")
        self._build(config)
        self._root.protocol("WM_DELETE_WINDOW", self._request_close)

    def _build(self, config: AgentConfig) -> None:
        frame = ttk.Frame(self._root, padding=22)
        frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(frame, text="Endpoint monitoring is active", font=("Segoe UI", 17, "bold")).pack(
            anchor=tk.W
        )
        ttk.Label(
            frame,
            text=f"Exam: {config.exam_id}   Student: {config.student_id}",
        ).pack(anchor=tk.W, pady=(5, 18))

        status = ttk.LabelFrame(frame, text="Status", padding=12)
        status.pack(fill=tk.X)
        ttk.Label(status, text="Connection:").grid(row=0, column=0, sticky=tk.W)
        ttk.Label(status, textvariable=self._connection, font=("Segoe UI", 10, "bold")).grid(
            row=0, column=1, sticky=tk.W, padx=(8, 0)
        )
        ttk.Label(status, text="Delivery queue:").grid(row=1, column=0, sticky=tk.W, pady=(6, 0))
        ttk.Label(status, textvariable=self._queue).grid(
            row=1, column=1, sticky=tk.W, padx=(8, 0), pady=(6, 0)
        )
        ttk.Label(status, textvariable=self._detail, foreground="#8a4b08", wraplength=520).grid(
            row=2, column=0, columnspan=2, sticky=tk.W, pady=(7, 0)
        )

        disclosure = ttk.LabelFrame(frame, text="Privacy disclosure", padding=14)
        disclosure.pack(fill=tk.BOTH, expand=True, pady=(18, 14))
        ttk.Label(
            disclosure,
            text=PRIVACY_DISCLOSURE,
            wraplength=540,
            justify=tk.LEFT,
        ).pack(anchor=tk.W)

        ttk.Label(
            frame,
            text=f"Development agent {__version__} • {platform.system()}",
            foreground="#666666",
        ).pack(anchor=tk.W)

    def run(self) -> None:
        self._runtime.start()
        self._root.after(150, self._drain_messages)
        self._root.mainloop()

    def _drain_messages(self) -> None:
        try:
            while True:
                kind, value = self._messages.get_nowait()
                if kind == "connection":
                    self._connection.set(value)
                elif kind == "detail":
                    self._detail.set(value)
                elif kind == "queue":
                    self._queue.set(value)
                elif kind == "shutdown_complete":
                    self._root.destroy()
                    return
        except Empty:
            pass
        self._root.after(150, self._drain_messages)

    def _request_close(self) -> None:
        if self._closing:
            return
        self._closing = True
        self._connection.set("Stopping")
        Thread(target=self._shutdown, name="agent-shutdown", daemon=True).start()

    def _shutdown(self) -> None:
        self._runtime.stop()
        self._messages.put(("shutdown_complete", ""))


def main() -> None:
    StatusWindow(parse_config()).run()
