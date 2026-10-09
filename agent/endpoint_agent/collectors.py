"""Windows-first, privacy-limited endpoint collectors."""

from __future__ import annotations

import ctypes
from ctypes import wintypes
from dataclasses import dataclass
import platform
from threading import Event, Thread
from typing import Any, Callable

import psutil

from .privacy import normalize_app_name

Emit = Callable[[str, dict[str, Any]], None]


def foreground_application_name() -> str:
    """Resolve only the foreground process executable name.

    This deliberately never calls GetWindowText or inspects command lines.
    """
    if platform.system() != "Windows":
        return "unknown"
    try:
        user32 = ctypes.windll.user32
        window = user32.GetForegroundWindow()
        if not window:
            return "unknown"
        process_id = wintypes.DWORD()
        user32.GetWindowThreadProcessId(window, ctypes.byref(process_id))
        if not process_id.value:
            return "unknown"
        return normalize_app_name(psutil.Process(process_id.value).name())
    except (OSError, psutil.Error, AttributeError):
        return "unknown"


def is_network_connected() -> bool | None:
    """Read Windows' connectivity flag without inspecting traffic."""
    if platform.system() != "Windows":
        return None
    try:
        flags = wintypes.DWORD()
        return bool(ctypes.windll.wininet.InternetGetConnectedState(ctypes.byref(flags), 0))
    except (OSError, AttributeError):
        return None


def display_configuration() -> tuple[tuple[int, int], ...] | None:
    """Return monitor resolutions only, sorted for stable comparisons."""
    if platform.system() != "Windows":
        return None

    rectangles: list[tuple[int, int]] = []
    try:
        monitor_callback = ctypes.WINFUNCTYPE(
            wintypes.BOOL,
            wintypes.HMONITOR,
            wintypes.HDC,
            ctypes.POINTER(wintypes.RECT),
            wintypes.LPARAM,
        )

        @monitor_callback
        def collect_monitor(
            _monitor: int,
            _device_context: int,
            rectangle: ctypes.POINTER(wintypes.RECT),
            _data: int,
        ) -> bool:
            rect = rectangle.contents
            rectangles.append((rect.right - rect.left, rect.bottom - rect.top))
            return True

        if not ctypes.windll.user32.EnumDisplayMonitors(None, None, collect_monitor, 0):
            return None
    except (OSError, AttributeError):
        return None
    return tuple(sorted(rectangles))


@dataclass(frozen=True)
class CollectorIntervals:
    foreground_seconds: float = 1.0
    system_seconds: float = 5.0


class CollectorService:
    def __init__(self, emit: Emit, intervals: CollectorIntervals | None = None) -> None:
        self._emit = emit
        self._intervals = intervals or CollectorIntervals()
        self._stop = Event()
        self._threads: list[Thread] = []

    def start(self) -> None:
        self._threads = [
            Thread(target=self._watch_foreground, name="foreground-monitor", daemon=True),
            Thread(target=self._watch_system, name="system-monitor", daemon=True),
        ]
        for thread in self._threads:
            thread.start()

    def stop(self) -> None:
        self._stop.set()
        for thread in self._threads:
            thread.join(timeout=2)

    def _watch_foreground(self) -> None:
        previous: str | None = None
        while not self._stop.is_set():
            current = foreground_application_name()
            if current != "unknown" and current != previous:
                self._emit("foreground_app_changed", {"application": current})
                previous = current
            self._stop.wait(self._intervals.foreground_seconds)

    def _watch_system(self) -> None:
        previous_connectivity: bool | None = None
        previous_displays: tuple[tuple[int, int], ...] | None = None
        while not self._stop.is_set():
            connectivity = is_network_connected()
            if connectivity is not None and connectivity != previous_connectivity:
                self._emit("network_state_changed", {"online": connectivity})
                previous_connectivity = connectivity

            displays = display_configuration()
            if displays is not None and displays != previous_displays:
                self._emit(
                    "display_state_changed",
                    {
                        "count": len(displays),
                        "resolutions": [
                            {"width": width, "height": height} for width, height in displays
                        ],
                    },
                )
                previous_displays = displays
            self._stop.wait(self._intervals.system_seconds)
