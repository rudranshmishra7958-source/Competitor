"""Authenticated WebSocket delivery with bounded exponential reconnect."""

from __future__ import annotations

from dataclasses import dataclass
import json
from threading import Event, Thread
from typing import Callable

from websockets.sync.client import connect

from .events import EventBuffer

StatusCallback = Callable[[str, str], None]


@dataclass(frozen=True)
class ReconnectPolicy:
    initial_seconds: float = 1.0
    maximum_seconds: float = 30.0

    def delay(self, attempt: int) -> float:
        return min(self.maximum_seconds, self.initial_seconds * (2 ** max(0, attempt)))


class WebSocketTransport:
    def __init__(
        self,
        ws_url: str,
        token: str,
        buffer: EventBuffer,
        status_callback: StatusCallback,
        reconnect: ReconnectPolicy | None = None,
        ack_timeout_seconds: float = 10.0,
    ) -> None:
        self._ws_url = ws_url
        self._token = token
        self._buffer = buffer
        self._status = status_callback
        self._reconnect = reconnect or ReconnectPolicy()
        self._ack_timeout = ack_timeout_seconds
        self._stop = Event()
        self._thread = Thread(target=self._run, name="websocket-transport", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=3)

    def _safe_error(self, error: Exception) -> str:
        message = str(error)
        if self._token:
            message = message.replace(self._token, "[redacted]")
        return message[:240]

    def _connect_url(self) -> str:
        if "token=" in self._ws_url:
            return self._ws_url
        separator = "&" if "?" in self._ws_url else "?"
        return f"{self._ws_url}{separator}token={self._token}"

    def _run(self) -> None:
        attempt = 0
        while not self._stop.is_set():
            self._status("connecting", "")
            try:
                with connect(
                    self._connect_url(),
                    additional_headers={"Authorization": f"Bearer {self._token}"},
                    open_timeout=10,
                    close_timeout=2,
                    ping_interval=20,
                    ping_timeout=20,
                ) as websocket:
                    attempt = 0
                    self._status("connected", "")
                    self._deliver(websocket)
            except Exception as error:  # The transport must survive all connection failures.
                if self._stop.is_set():
                    break
                delay = self._reconnect.delay(attempt)
                attempt += 1
                self._status("disconnected", f"Retrying in {delay:g}s: {self._safe_error(error)}")
                self._stop.wait(delay)
        self._status("stopped", "")

    def _deliver(self, websocket: object) -> None:
        while not self._stop.is_set():
            event = self._buffer.peek(timeout=0.5)
            if event is None:
                continue
            websocket.send(json.dumps(event, separators=(",", ":")))
            raw_acknowledgement = websocket.recv(timeout=self._ack_timeout)
            acknowledgement = json.loads(raw_acknowledgement)
            if not isinstance(acknowledgement, dict) or "accepted" not in acknowledgement:
                raise RuntimeError("server returned an invalid acknowledgement")
            self._buffer.acknowledge(event)
