"""Webcam proctoring: snapshot storage and prioritized incident review.

Only still images are ever uploaded. The browser analyses the camera on-device and
sends events plus the occasional JPEG; video is never transmitted or stored.
"""

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import ExamSession, SessionSnapshot, User
from app.risk import CAMERA_TYPES, CORROBORATING_TYPES, RULE_WEIGHTS
from app.security import admin_user, student_user

router = APIRouter()

SAFE_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
JPEG_MAGIC = b"\xff\xd8\xff"
SnapshotKind = Literal["reference", "periodic", "incident"]

INCIDENT_LABELS = {
    "face_absent": "Student left the camera view",
    "framing_lost": "Desk or shoulders out of frame",
    "camera_blocked": "Camera covered or turned off",
    "virtual_camera": "Virtual camera software detected",
    "multiple_people": "Another person in view",
    "device_detected": "Phone or second device visible",
    "visibility_hidden": "Left the exam tab",
    "navigation_away": "Navigated away from the exam",
    "window_blur": "Exam window lost focus",
    "fullscreen_exit": "Left fullscreen",
    "clipboard_copy": "Copied from the exam",
    "clipboard_cut": "Cut from the exam",
    "clipboard_paste": "Pasted into the exam",
    "contextmenu": "Opened the right-click menu",
    "devtools_open": "Opened developer tools",
    "process_blacklisted": "Prohibited application in focus",
    "multiple_displays": "Second display connected",
    "virtual_machine": "Running inside a virtual machine",
}


# How a corroborating signal reads in "X while Y" sentences.
CONTEXT_PHRASES = {
    "visibility_hidden": "the exam tab was hidden",
    "navigation_away": "they navigated away",
    "window_blur": "the exam window lost focus",
    "fullscreen_exit": "they left fullscreen",
    "clipboard_copy": "text was copied",
    "clipboard_paste": "text was pasted",
    "devtools_open": "developer tools were open",
    "process_blacklisted": "a prohibited app was in focus",
    "foreground_app_changed": "another app was in focus",
    "multiple_displays": "a second display was connected",
    "face_absent": "they were away from the camera",
    "device_detected": "a phone or device was visible",
    "multiple_people": "another person was in view",
    "camera_blocked": "the camera was covered",
    "framing_lost": "the desk was out of frame",
}


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() + "Z" if value else None


def _parse(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)


# ---------- Storage ----------

BACKEND_DIR = Path(__file__).resolve().parent.parent


def snapshot_root() -> Path:
    """Relative paths are anchored to the backend folder, whatever the working directory."""
    root = Path(settings.snapshot_dir)
    return (root if root.is_absolute() else BACKEND_DIR / root).resolve()


def store_snapshot(
    db: Session,
    session_id: str,
    student_id: str,
    data: bytes,
    kind: str,
    event_type: str | None = None,
    created_at: datetime | None = None,
) -> SessionSnapshot:
    if not SAFE_ID.match(session_id):
        raise HTTPException(status_code=422, detail="Invalid session id")
    folder = snapshot_root() / session_id
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{uuid4().hex}.jpg"
    path.write_bytes(data)
    row = SessionSnapshot(
        session_id=session_id,
        student_id=student_id,
        kind=kind,
        event_type=event_type,
        path=str(path),
        bytes=len(data),
        created_at=created_at or utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_snapshots(db: Session, session_ids: list[str]) -> None:
    rows = db.query(SessionSnapshot).filter(SessionSnapshot.session_id.in_(session_ids)).all()
    for row in rows:
        Path(row.path).unlink(missing_ok=True)
        db.delete(row)
    db.commit()


def purge_expired_snapshots(db: Session) -> int:
    cutoff = utcnow() - timedelta(days=settings.snapshot_retention_days)
    rows = db.query(SessionSnapshot).filter(SessionSnapshot.created_at < cutoff).all()
    for row in rows:
        Path(row.path).unlink(missing_ok=True)
        db.delete(row)
    db.commit()
    return len(rows)


def snapshot_json(row: SessionSnapshot) -> dict:
    return {
        "id": row.id,
        "kind": row.kind,
        "eventType": row.event_type,
        "createdAt": _iso(row.created_at),
        "bytes": row.bytes,
    }


def session_snapshots(db: Session, session_id: str) -> list[SessionSnapshot]:
    return (
        db.query(SessionSnapshot)
        .filter_by(session_id=session_id)
        .order_by(SessionSnapshot.created_at, SessionSnapshot.id)
        .all()
    )


# ---------- Routes ----------

@router.post("/sessions/{session_id}/snapshots", status_code=201)
async def upload_snapshot(
    session_id: str,
    request: Request,
    user: Annotated[User, Depends(student_user)],
    kind: SnapshotKind = "incident",
    eventType: str | None = None,
    db: Session = Depends(get_db),
):
    session = db.query(ExamSession).filter_by(session_id=session_id).first()
    if not session or session.student_id != user.id:
        raise HTTPException(status_code=403, detail="Snapshot scope mismatch")
    if session.expires_at <= utcnow() or session.submitted_at:
        raise HTTPException(status_code=409, detail="Session is closed")
    if eventType is not None and (len(eventType) > 64 or not SAFE_ID.match(eventType)):
        raise HTTPException(status_code=422, detail="Invalid event type")
    data = await request.body()
    if len(data) > settings.snapshot_max_bytes:
        raise HTTPException(status_code=413, detail="Snapshot too large")
    if not data.startswith(JPEG_MAGIC):
        raise HTTPException(status_code=415, detail="Snapshots must be JPEG images")
    count = db.query(SessionSnapshot).filter_by(session_id=session_id).count()
    if count >= settings.snapshot_max_per_session:
        raise HTTPException(status_code=429, detail="Snapshot limit reached")
    row = store_snapshot(db, session_id, user.id, data, kind, eventType)
    return snapshot_json(row)


@router.get("/admin/sessions/{session_id}/snapshots")
def list_snapshots(
    session_id: str,
    _: Annotated[User, Depends(admin_user)],
    db: Session = Depends(get_db),
):
    return [snapshot_json(row) for row in session_snapshots(db, session_id)]


@router.get("/admin/snapshots/{snapshot_id}")
def snapshot_file(
    snapshot_id: int,
    _: Annotated[User, Depends(admin_user)],
    db: Session = Depends(get_db),
):
    row = db.get(SessionSnapshot, snapshot_id)
    if not row:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    path = Path(row.path).resolve()
    if snapshot_root() not in path.parents or not path.exists():
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return FileResponse(path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"})


# ---------- Incidents and priority ----------

def _category(event: dict) -> str:
    if event["effectiveType"] in CAMERA_TYPES:
        return "camera"
    return "agent" if event["source"] == "endpoint" else "browser"


def _confidence(event: dict) -> float:
    value = event.get("metadata", {}).get("confidence")
    if isinstance(value, (int, float)) and 0 < value <= 1:
        return float(value)
    # Browser and agent events are deterministic observations; camera ones are model output.
    return 0.75 if _category(event) == "camera" else 1.0


def build_incidents(events: list[dict], snapshots: list[SessionSnapshot]) -> list[dict]:
    """Group raw events into reviewable incidents and rank them by priority."""
    relevant = [e for e in events if e["effectiveType"] in RULE_WEIGHTS]
    relevant.sort(key=lambda e: e["timestamp"])
    groups: list[list[dict]] = []
    for event in relevant:
        at = _parse(event["timestamp"])
        last = groups[-1] if groups else None
        if (
            last
            and last[-1]["effectiveType"] == event["effectiveType"]
            and at - _parse(last[-1]["timestamp"]) <= timedelta(seconds=30)
        ):
            last.append(event)
        else:
            groups.append([event])

    all_times = [(_parse(e["timestamp"]), e) for e in events]
    incidents = []
    for index, group in enumerate(groups):
        kind = group[0]["effectiveType"]
        start = _parse(group[0]["timestamp"])
        end = _parse(group[-1]["timestamp"])
        duration = (end - start).total_seconds()
        for event in group:
            ms = event.get("metadata", {}).get("durationMs")
            if isinstance(ms, (int, float)):
                duration = max(duration, ms / 1000)
        category = _category(group[0])
        window_start, window_end = start - timedelta(seconds=30), end + timedelta(seconds=30)
        corroborating = sorted(
            {
                e["effectiveType"]
                for at, e in all_times
                if window_start <= at <= window_end
                and _category(e) != category
                and (e["effectiveType"] in RULE_WEIGHTS or e["type"] in CORROBORATING_TYPES)
            }
        )
        scored = any(e["scored"] for e in group)
        points = sum(e["points"] for e in group) if scored else RULE_WEIGHTS[kind]
        confidence = max(_confidence(e) for e in group)
        snapshot_ids = {
            e["metadata"]["snapshotId"]
            for e in group
            if isinstance(e.get("metadata", {}).get("snapshotId"), int)
        }
        for snap in snapshots:
            if (
                snap.kind == "incident"
                and snap.event_type == kind
                and start - timedelta(seconds=10) <= snap.created_at <= end + timedelta(seconds=10)
            ):
                snapshot_ids.add(snap.id)
        priority = points * confidence
        priority *= 1.5 if corroborating else 1.0
        priority *= 1 + min(1.0, duration / 60)
        if not scored:
            priority *= 0.3
        label = INCIDENT_LABELS.get(kind, kind.replace("_", " ").capitalize())
        detail = []
        if len(group) > 1:
            detail.append(f"{len(group)} times")
        if duration >= 1:
            detail.append(f"{int(round(duration))} s")
        label_parts = [label + (f" ({', '.join(detail)})" if detail else "")]
        if corroborating:
            label_parts.append(
                "while " + " and ".join(CONTEXT_PHRASES.get(t, t.replace("_", " ")) for t in corroborating[:2])
            )
        devices = sorted({str(e["metadata"].get("label")) for e in group if e.get("metadata", {}).get("label")})
        incidents.append(
            {
                "id": f"inc-{index + 1}",
                "type": kind,
                "category": category,
                "title": label,
                "reason": " ".join(label_parts),
                "startedAt": _iso(start),
                "endedAt": _iso(end),
                "durationSeconds": round(duration, 1),
                "count": len(group),
                "scored": scored,
                "points": points if scored else 0,
                "confidence": round(confidence, 2),
                "corroboratedBy": corroborating,
                "devices": devices,
                "eventIds": [e["id"] for e in group],
                "snapshotIds": sorted(snapshot_ids),
                "priority": round(priority, 1),
            }
        )
    incidents.sort(key=lambda i: (-i["priority"], i["startedAt"]))
    return incidents


def session_priority(incidents: list[dict], events: list[dict], session: ExamSession, snapshots: list[SessionSnapshot]) -> dict:
    top = incidents[:3]
    score = min(100, round(sum(i["priority"] for i in top) * 5))
    if score >= 60:
        level = "critical"
    elif score >= 35:
        level = "high"
    elif score >= 15:
        level = "medium"
    else:
        level = "low"
    webcam = bool(json.loads(session.policy_json or "{}").get("webcam", {}).get("required"))
    blocked = sum(i["durationSeconds"] for i in incidents if i["type"] == "camera_blocked")
    end = session.submitted_at or min(utcnow(), session.expires_at)
    total = max(1.0, (end - session.started_at).total_seconds())
    lead = top[0] if top else None
    if not lead:
        strength = "none"
    elif lead["corroboratedBy"] and lead["snapshotIds"]:
        strength = "strong"
    elif lead["corroboratedBy"] or lead["snapshotIds"]:
        strength = "moderate"
    else:
        strength = "weak"
    return {
        "score": score,
        "level": level,
        "reasons": [i["reason"] for i in top],
        "evidenceStrength": strength,
        "corroboratedIncidents": sum(1 for i in incidents if i["corroboratedBy"]),
        "singleSourceIncidents": sum(1 for i in incidents if not i["corroboratedBy"]),
        "webcam": webcam,
        "cameraUptime": round(max(0.0, 1 - blocked / total), 3) if webcam else None,
        "snapshotCount": len(snapshots),
    }
