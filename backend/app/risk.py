import json
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.config import settings
from app.models import ExamSession, MonitorEventRow, RiskSnapshot, User

RULE_VERSION = "risk-v3.0"
POLICY_EVENT_MAP = {
    "visibility_hidden": "tabSwitch",
    "window_blur": "multiWindow",
    "fullscreen_exit": "fullscreen",
    "clipboard_copy": "clipboard",
    "clipboard_cut": "clipboard",
    "clipboard_paste": "clipboard",
    "contextmenu": "clipboard",
    "devtools_open": "tabSwitch",
    "navigation_away": "tabSwitch",
    "process_blacklisted": "externalApp",
    "foreground_app_changed": "externalApp",
    "multiple_displays": "multiWindow",
    "display_state_changed": "multiWindow",
    "virtual_machine": "externalApp",
    # Webcam proctoring (only emitted when the exam enables it).
    "face_absent": "cameraPresence",
    "framing_lost": "cameraPresence",
    "camera_blocked": "cameraPresence",
    "virtual_camera": "cameraPresence",
    "multiple_people": "cameraPeople",
    "device_detected": "cameraDevice",
}
CAMERA_TYPES = {
    "face_absent",
    "framing_lost",
    "camera_blocked",
    "virtual_camera",
    "multiple_people",
    "device_detected",
}
# Browser/agent signals that, if they overlap a camera incident, make it far more credible.
CORROBORATING_TYPES = {
    "visibility_hidden",
    "navigation_away",
    "window_blur",
    "process_blacklisted",
    "foreground_app_changed",
    "clipboard_paste",
}
PROHIBITED_APP_NAMES = {
    "discord.exe",
    "telegram.exe",
    "slack.exe",
    "whatsapp.exe",
    "chatgpt.exe",
    "copilot.exe",
}
RULE_WEIGHTS = {
    "visibility_hidden": 1,
    "window_blur": 1,
    "fullscreen_exit": 1,
    "clipboard_copy": 1,
    "clipboard_cut": 1,
    "clipboard_paste": 2,
    "contextmenu": 1,
    "devtools_open": 3,
    "navigation_away": 2,
    "process_blacklisted": 5,
    "multiple_displays": 2,
    "virtual_machine": 2,
    "face_absent": 2,
    "framing_lost": 1,
    "camera_blocked": 4,
    "virtual_camera": 4,
    "multiple_people": 4,
    "device_detected": 3,
}


# Apps that may be in focus during an exam. Anything else the agent reports is scored.
ALLOWED_APPS = {
    "chrome.exe",
    "msedge.exe",
    "firefox.exe",
    "brave.exe",
    "opera.exe",
    "safari",
    "python.exe",
    "pythonw.exe",
    "py.exe",
    "explorer.exe",
    "lockapp.exe",
    "searchhost.exe",
    "shellexperiencehost.exe",
    "startmenuexperiencehost.exe",
}


def _policy_weight(policy: dict | None, key: str) -> int | None:
    weights = (policy or {}).get("weights")
    if not isinstance(weights, dict) or key not in weights:
        return None
    try:
        return max(0, min(10, int(weights[key])))
    except (TypeError, ValueError):
        return None


def allowed_apps(policy: dict | None) -> set[str]:
    extra = (policy or {}).get("allowedApps") or []
    return ALLOWED_APPS | {str(name).strip().lower() for name in extra if str(name).strip()}


def event_points(effective: str, metadata: dict, policy: dict | None = None) -> int:
    """Base weight (per-exam override for other apps), plus time away from the camera."""
    points = RULE_WEIGHTS[effective]
    if effective == "process_blacklisted":
        override = _policy_weight(policy, "externalApp")
        if override is not None:
            points = override
    if effective == "face_absent":
        seconds = float(metadata.get("durationMs") or 0) / 1000
        points += min(3, max(0, int((seconds - 5) // 10)))
    return points


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _policy_mode(policy: dict, event_type: str) -> str:
    category = POLICY_EVENT_MAP.get(event_type, event_type)
    rules = policy.get("rules", policy)
    value = rules.get(event_type, rules.get(category, "enforce"))
    if isinstance(value, dict):
        value = value.get("mode", value.get("action", "enforce"))
    if value is False or str(value).lower() in {"off", "disabled", "ignore", "false"}:
        return "ignore"
    if str(value).lower() in {"allow", "allow_but_log", "log", "log_only"}:
        return "allow_but_log"
    return "enforce"


def _event_time(row: MonitorEventRow) -> datetime:
    if abs(row.clock_skew_ms or 0) > 300_000:
        return row.received_at or row.timestamp
    return row.timestamp


def event_scored(policy: dict, event_type: str) -> bool:
    return event_type in RULE_WEIGHTS and _policy_mode(policy, event_type) == "enforce"


def _effective_type(row: MonitorEventRow, policy: dict | None = None) -> str:
    if row.type in RULE_WEIGHTS:
        return row.type
    metadata = json.loads(row.metadata_json or "{}")
    if row.type == "foreground_app_changed":
        app = str(metadata.get("application") or metadata.get("name") or "").strip().lower()
        if app and app != "unknown" and app not in allowed_apps(policy):
            return "process_blacklisted"
    if row.type == "display_state_changed" and int(metadata.get("count") or 0) > 1:
        return "multiple_displays"
    return row.type


def classify_event(row: MonitorEventRow, policy: dict) -> dict:
    effective = _effective_type(row, policy)
    in_rules = effective in RULE_WEIGHTS
    mode = _policy_mode(policy, effective) if in_rules else "ignore"
    if effective == "process_blacklisted" and _policy_weight(policy, "externalApp") == 0 and mode == "enforce":
        mode = "allow_but_log"
    scored = in_rules and mode == "enforce"
    return {
        "effectiveType": effective,
        "policyKey": POLICY_EVENT_MAP.get(effective) or POLICY_EVENT_MAP.get(row.type),
        "mode": mode,
        "scored": scored,
        "points": event_points(effective, json.loads(row.metadata_json or "{}"), policy) if scored else 0,
    }


def endpoint_required(policy: dict) -> bool:
    endpoint_policy = policy.get("endpoint")
    return bool(
        policy.get("endpointRequired")
        or policy.get("requireEndpointAgent")
        or (endpoint_policy.get("required") if isinstance(endpoint_policy, dict) else False)
    )


def score_session(db: Session, session_id: str, persist: bool = True) -> dict:
    session = db.query(ExamSession).filter(ExamSession.session_id == session_id).first()
    rows = (
        db.query(MonitorEventRow)
        .filter(MonitorEventRow.session_id == session_id)
        .order_by(MonitorEventRow.received_at, MonitorEventRow.id)
        .all()
    )
    policy = json.loads(session.policy_json or "{}") if session else {}
    browser = [r for r in rows if r.source == "browser"]
    endpoint = [r for r in rows if r.source == "endpoint"]
    classified = []
    for row in rows:
        info = classify_event(row, policy)
        if info["effectiveType"] not in RULE_WEIGHTS:
            continue
        classified.append((row, info))
    enforced = [row for row, info in classified if info["scored"]]
    logged = [row for row, info in classified if info["mode"] == "allow_but_log"]
    base_points = sum(info["points"] for _row, info in classified if info["scored"])

    correlations: list[dict] = []
    for left in [row for row in enforced if row.source == "browser"]:
        for right in [row for row in enforced if row.source == "endpoint"]:
            delta = abs((_event_time(left) - _event_time(right)).total_seconds())
            if delta <= 12:
                correlations.append(
                    {"browser": left.type, "endpoint": right.type, "secondsApart": round(delta, 2)}
                )
                break

    for camera in [row for row in enforced if row.type in CAMERA_TYPES]:
        for other in rows:
            if other.type not in CORROBORATING_TYPES:
                continue
            delta = abs((_event_time(camera) - _event_time(other)).total_seconds())
            if delta <= 30:
                correlations.append(
                    {"browser": other.type, "endpoint": camera.type, "secondsApart": round(delta, 2), "camera": True}
                )
                break

    bursts: list[dict] = []
    for (source, event_type), count in Counter((r.source, r.type) for r in enforced).items():
        relevant = [r for r in enforced if r.source == source and r.type == event_type]
        for index in range(len(relevant) - 2):
            if _event_time(relevant[index + 2]) - _event_time(relevant[index]) <= timedelta(seconds=60):
                bursts.append({"source": source, "type": event_type, "count": count})
                break

    required = endpoint_required(policy)
    endpoint_missing = bool(
        required
        and session
        and utcnow() > session.started_at + timedelta(seconds=settings.endpoint_grace_seconds)
        and not endpoint
    )
    points = base_points + len(correlations) * 3 + len(bursts) * 2 + (4 if endpoint_missing else 0)
    if points >= 8:
        level = "high"
    elif points >= 3:
        level = "medium"
    else:
        level = "low"

    latest = rows[-1].type if rows else "None"
    student_id = session.student_id if session else (rows[0].student_id if rows else "")
    exam_id = session.exam_id if session else (rows[0].exam_id if rows else "")
    user = db.get(User, student_id) if student_id else None
    submission = next((row for row in reversed(rows) if row.type == "submission_saved"), None)
    submission_timing = None
    if submission and session:
        submission_timing = {
            "secondsAfterStart": max(0, int((_event_time(submission) - session.started_at).total_seconds())),
            "receivedAt": submission.received_at.isoformat() + "Z",
        }
    result = {
        "ruleName": "Policy-aware integrity risk",
        "ruleVersion": RULE_VERSION,
        "studentId": student_id,
        "displayName": user.display_name if user else student_id or "Unknown",
        "examId": exam_id,
        "sessionId": session_id,
        "score": points,
        "risk": level,
        "latestAnomaly": latest,
        "browser": len(browser),
        "endpoint": len(endpoint),
        "correlated": len(correlations),
        "why": {
            "scored": [
                {"type": row.type, "source": row.source, "points": info["points"]}
                for row, info in classified
                if info["scored"]
            ],
            "allowButLog": [{"type": r.type, "source": r.source} for r in logged],
            "correlations": correlations,
            "bursts": bursts,
            "endpointMissing": endpoint_missing,
            "submissionSaved": submission_timing,
        },
    }
    if persist and session:
        last = (
            db.query(RiskSnapshot)
            .filter_by(session_id=session_id)
            .order_by(RiskSnapshot.created_at.desc())
            .first()
        )
        if not last or last.score != points or last.level != level or last.rule_version != RULE_VERSION:
            db.add(
                RiskSnapshot(
                    session_id=session_id,
                    rule_version=RULE_VERSION,
                    score=points,
                    level=level,
                    details_json=json.dumps(result),
                    created_at=utcnow(),
                )
            )
            db.commit()
    return result
