"""Event creation and the reconnect-safe in-memory buffer."""

from __future__ import annotations

from collections import deque
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from threading import Condition
import time
from typing import Any


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


@dataclass(frozen=True)
class EventIdentity:
    exam_id: str
    student_id: str
    session_id: str

    def build(self, event_type: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
        return {
            "type": event_type,
            "timestamp": utc_timestamp(),
            "examId": self.exam_id,
            "studentId": self.student_id,
            "sessionId": self.session_id,
            "source": "endpoint",
            "metadata": metadata or {},
        }


class EventBuffer:
    """A bounded FIFO where the head stays queued until acknowledged."""

    def __init__(self, capacity: int = 256) -> None:
        if capacity < 1:
            raise ValueError("capacity must be at least one")
        self.capacity = capacity
        self._items: deque[dict[str, Any]] = deque()
        self._fingerprints: set[str] = set()
        self._condition = Condition()
        self.dropped_count = 0

    @staticmethod
    def _fingerprint(event: dict[str, Any]) -> str:
        stable = {
            "type": event.get("type"),
            "source": event.get("source"),
            "metadata": event.get("metadata", {}),
        }
        return json.dumps(stable, sort_keys=True, separators=(",", ":"), default=str)

    def put(self, event: dict[str, Any]) -> bool:
        """Queue an event; return False when an equivalent event is pending."""
        item = deepcopy(event)
        fingerprint = self._fingerprint(item)
        with self._condition:
            if fingerprint in self._fingerprints:
                return False
            if len(self._items) >= self.capacity:
                removed = self._items.popleft()
                self._fingerprints.discard(self._fingerprint(removed))
                self.dropped_count += 1
            self._items.append(item)
            self._fingerprints.add(fingerprint)
            self._condition.notify()
            return True

    def peek(self, timeout: float | None = None) -> dict[str, Any] | None:
        """Copy the oldest event without removing it."""
        with self._condition:
            if not self._items:
                self._condition.wait(timeout)
            return deepcopy(self._items[0]) if self._items else None

    def acknowledge(self, event: dict[str, Any]) -> bool:
        """Remove event only if it is still the queue head."""
        with self._condition:
            if not self._items or self._items[0] != event:
                return False
            removed = self._items.popleft()
            self._fingerprints.discard(self._fingerprint(removed))
            self._condition.notify_all()
            return True

    def wait_until_empty(self, timeout: float) -> bool:
        deadline = time.monotonic() + timeout
        with self._condition:
            while self._items:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return False
                self._condition.wait(remaining)
            return True

    def snapshot(self) -> list[dict[str, Any]]:
        with self._condition:
            return deepcopy(list(self._items))

    def __len__(self) -> int:
        with self._condition:
            return len(self._items)
