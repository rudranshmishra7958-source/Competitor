"""Command-line, JSON-file, and environment configuration."""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
import json
import os
from pathlib import Path
from typing import Any, Sequence


@dataclass(frozen=True)
class AgentConfig:
    ws_url: str
    exam_id: str
    student_id: str
    session_id: str
    token: str = field(repr=False)
    queue_capacity: int = 256
    heartbeat_seconds: float = 30.0


def _load_json(path: str | None, parser: argparse.ArgumentParser) -> dict[str, Any]:
    if not path:
        return {}
    try:
        value = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        parser.error(f"could not read config file: {error}")
    if not isinstance(value, dict):
        parser.error("config file must contain a JSON object")
    return {str(key).replace("-", "_"): item for key, item in value.items()}


def parse_config(arguments: Sequence[str] | None = None) -> AgentConfig:
    parser = argparse.ArgumentParser(description="Visible examination endpoint status agent")
    parser.add_argument("--config", help="Optional JSON configuration file")
    parser.add_argument("--ws-url")
    parser.add_argument("--exam-id")
    parser.add_argument("--student-id")
    parser.add_argument("--session-id")
    parser.add_argument("--token")
    parser.add_argument("--queue-capacity", type=int)
    parser.add_argument("--heartbeat-seconds", type=float)
    parsed = parser.parse_args(arguments)
    file_values = _load_json(parsed.config, parser)

    def value(name: str, env_name: str, default: Any = None) -> Any:
        cli_value = getattr(parsed, name)
        if cli_value is not None:
            return cli_value
        if name in file_values:
            return file_values[name]
        return os.environ.get(env_name, default)

    required = {
        "exam_id": value("exam_id", "AGENT_EXAM_ID"),
        "student_id": value("student_id", "AGENT_STUDENT_ID"),
        "session_id": value("session_id", "AGENT_SESSION_ID"),
        "token": value("token", "AGENT_TOKEN"),
    }
    missing = [name.replace("_", "-") for name, item in required.items() if not str(item or "").strip()]
    if missing:
        parser.error("missing required configuration: " + ", ".join(missing))

    ws_url = str(value("ws_url", "INGEST_WS_URL", "ws://localhost:8000/ws/events")).strip()
    queue_capacity = int(value("queue_capacity", "AGENT_QUEUE_CAPACITY", 256))
    heartbeat_seconds = float(value("heartbeat_seconds", "AGENT_HEARTBEAT_SECONDS", 30.0))
    if not ws_url.startswith(("ws://", "wss://")):
        parser.error("ws-url must start with ws:// or wss://")
    if queue_capacity < 1:
        parser.error("queue-capacity must be at least one")
    if heartbeat_seconds < 5:
        parser.error("heartbeat-seconds must be at least five")

    return AgentConfig(
        ws_url=ws_url,
        exam_id=str(required["exam_id"]).strip(),
        student_id=str(required["student_id"]).strip(),
        session_id=str(required["session_id"]).strip(),
        token=str(required["token"]),
        queue_capacity=queue_capacity,
        heartbeat_seconds=heartbeat_seconds,
    )
