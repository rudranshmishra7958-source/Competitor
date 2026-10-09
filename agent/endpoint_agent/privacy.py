"""Privacy boundaries shared by endpoint collectors."""

from __future__ import annotations

import ntpath
import re

_CONTROL_CHARACTERS = re.compile(r"[\x00-\x1f\x7f]")
MAX_APP_NAME_LENGTH = 128


def normalize_app_name(value: object) -> str:
    """Return a bounded executable name, never a path or window title."""
    if not isinstance(value, str):
        return "unknown"

    # ntpath handles both Windows and POSIX separators on every platform.
    name = ntpath.basename(value.replace("/", "\\"))
    name = _CONTROL_CHARACTERS.sub("", name).strip()
    if not name or name in {".", ".."}:
        return "unknown"
    return name[:MAX_APP_NAME_LENGTH]
