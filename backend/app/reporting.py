import csv
import io
import json
from datetime import datetime, timedelta, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.models import ExamSession, MonitorEventRow, ReviewDecision, User
from app.proctoring import build_incidents, session_priority, session_snapshots, snapshot_json
from app.risk import classify_event, endpoint_required, score_session


def application_from_metadata(raw: str | dict | None) -> str | None:
    if isinstance(raw, str):
        try:
            data = json.loads(raw or "{}")
        except json.JSONDecodeError:
            return None
    elif isinstance(raw, dict):
        data = raw
    else:
        return None
    value = data.get("application") or data.get("name")
    if not isinstance(value, str):
        return None
    name = value.replace("/", "\\").split("\\")[-1].strip()
    if not name or name in {".", ".."}:
        return None
    return name[:128]


def latest_anomaly_application(db: Session, session_id: str) -> str | None:
    rows = (
        db.query(MonitorEventRow)
        .filter_by(session_id=session_id)
        .order_by(MonitorEventRow.received_at.desc(), MonitorEventRow.id.desc())
        .limit(30)
        .all()
    )
    for row in rows:
        if row.type not in {"foreground_app_changed", "process_blacklisted"} and row.source != "endpoint":
            continue
        name = application_from_metadata(row.metadata_json)
        if name:
            return name
    return None


def _iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat() + "Z"


def _review_json(review: ReviewDecision | None) -> dict:
    decision = review.decision if review else "unreviewed"
    return {
        "status": decision,
        "decision": decision,
        "note": review.note if review else "",
        "reviewedBy": review.reviewer_id if review else None,
        "reviewerId": review.reviewer_id if review else None,
        "reviewedAt": _iso(review.reviewed_at) if review else None,
    }


def _assurance(session: ExamSession, risk: dict) -> str:
    policy = json.loads(session.policy_json or "{}")
    required = endpoint_required(policy) or bool(risk.get("why", {}).get("endpointMissing"))
    endpoint_fresh = bool(risk.get("endpoint"))
    if session.endpoint_connected_at and not session.endpoint_disconnected_at:
        endpoint_fresh = True
    if endpoint_fresh:
        return "browser_endpoint"
    if required:
        return "agent_required_missing"
    return "browser_only"


def _breakdown(risk: dict) -> dict:
    return {
        "browser": risk.get("browser", 0),
        "endpoint": risk.get("endpoint", 0),
        "correlated": risk.get("correlated", 0),
        "total": risk.get("score", 0),
    }


def session_live_row(db: Session, session: ExamSession, persist: bool = False) -> dict:
    risk = score_session(db, session.session_id, persist=persist)
    review = db.query(ReviewDecision).filter_by(session_id=session.session_id).first()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    fresh = bool(session.last_seen_at and session.last_seen_at >= now - timedelta(seconds=30))
    browser_connected = bool(
        fresh and session.browser_connected_at and not session.browser_disconnected_at
    )
    endpoint_connected = bool(
        session.endpoint_connected_at
        and (not session.endpoint_disconnected_at or session.endpoint_connected_at > session.endpoint_disconnected_at)
        and session.last_seen_at
        and session.last_seen_at >= now - timedelta(seconds=45)
    )
    if session.endpoint_connected_at and not session.endpoint_disconnected_at:
        endpoint_connected = True
    return {
        "id": session.id,
        "sessionId": session.session_id,
        "examId": session.exam_id,
        "studentId": session.student_id,
        "displayName": risk["displayName"],
        "policy": json.loads(session.policy_json or "{}"),
        "startedAt": _iso(session.started_at),
        "expiresAt": _iso(session.expires_at),
        "submittedAt": _iso(session.submitted_at),
        "lastSeenAt": _iso(session.last_seen_at),
        "connected": browser_connected,
        "browserConnected": browser_connected,
        "endpointConnected": endpoint_connected,
        "assurance": _assurance(session, risk),
        "risk": risk["risk"],
        "score": risk["score"],
        "latestAnomaly": risk["latestAnomaly"],
        "latestAnomalyApplication": latest_anomaly_application(db, session.session_id),
        "review": _review_json(review),
        "breakdown": _breakdown(risk),
        **_priority_fields(db, session),
        "why": risk["why"],
        "ruleVersion": risk["ruleVersion"],
    }


def _priority_fields(db: Session, session: ExamSession) -> dict:
    snapshots = session_snapshots(db, session.session_id)
    events = _timeline_events(db, session)
    incidents = build_incidents(events, snapshots)
    latest = next((s for s in reversed(snapshots) if s.kind != "reference"), None) or (
        snapshots[-1] if snapshots else None
    )
    return {
        "priority": session_priority(incidents, events, session, snapshots),
        "latestSnapshotId": latest.id if latest else None,
        "topIncident": incidents[0] if incidents else None,
    }


def _timeline_events(db: Session, session: ExamSession) -> list[dict]:
    policy = json.loads(session.policy_json or "{}")
    rows = (
        db.query(MonitorEventRow)
        .filter_by(session_id=session.session_id)
        .order_by(MonitorEventRow.received_at, MonitorEventRow.id)
        .all()
    )
    events = []
    for row in rows:
        info = classify_event(row, policy)
        events.append(
            {
                "id": row.id,
                "type": row.type,
                "timestamp": _iso(row.timestamp),
                "receivedAt": _iso(row.received_at),
                "clockSkewMs": row.clock_skew_ms,
                "examId": row.exam_id,
                "studentId": row.student_id,
                "sessionId": row.session_id,
                "source": row.source,
                "metadata": json.loads(row.metadata_json or "{}"),
                "scored": info["scored"],
                "policyKey": info["policyKey"],
                "points": info["points"],
                "effectiveType": info["effectiveType"],
            }
        )
    return events


def integrity_summary(risk: dict) -> str:
    why = risk["why"]
    scored = len(why["scored"])
    logged = len(why["allowButLog"])
    correlated = len(why["correlations"])
    level = risk["risk"]
    parts = [f"Integrity risk is {level} with a score of {risk['score']}."]
    parts.append(f"{scored} policy-scored event(s) and {logged} log-only event(s) were recorded.")
    if correlated:
        parts.append(f"{correlated} browser/endpoint correlation(s) increased the score.")
    if why["endpointMissing"]:
        parts.append("The required endpoint agent did not report.")
    if why["submissionSaved"]:
        parts.append(
            f"The submission was saved {why['submissionSaved']['secondsAfterStart']} seconds after start."
        )
    return " ".join(parts)


def report_dto(db: Session, session: ExamSession) -> dict:
    risk = score_session(db, session.session_id, persist=False)
    review = db.query(ReviewDecision).filter_by(session_id=session.session_id).first()
    user = db.get(User, session.student_id)
    events = _timeline_events(db, session)
    summary = integrity_summary(risk)
    review_json = _review_json(review)
    snapshots = session_snapshots(db, session.session_id)
    incidents = build_incidents(events, snapshots)
    priority = session_priority(incidents, events, session, snapshots)
    correlations = [
        {
            "rule": "cross_source",
            "label": f"{hit['browser']} overlapped {hit['endpoint']}",
            "weight": 3,
            "eventIds": [],
            "secondsApart": hit.get("secondsApart"),
        }
        for hit in risk["why"]["correlations"]
    ]
    for burst in risk["why"]["bursts"]:
        correlations.append(
            {
                "rule": "burst",
                "label": f"{burst['count']} {burst['type']} events from {burst['source']} in one minute",
                "weight": 2,
                "eventIds": [],
            }
        )
    if risk["why"]["endpointMissing"]:
        correlations.append(
            {
                "rule": "endpoint_missing",
                "label": "Required endpoint agent did not report after the grace period",
                "weight": 4,
                "eventIds": [],
            }
        )
    return {
        "sessionId": session.session_id,
        "examId": session.exam_id,
        "studentId": session.student_id,
        "displayName": user.display_name if user else session.student_id,
        "startedAt": _iso(session.started_at),
        "expiresAt": _iso(session.expires_at),
        "submittedAt": _iso(session.submitted_at),
        "updatedAt": _iso(session.last_seen_at),
        "review": review_json,
        "reviewStatus": review_json["status"],
        "risk": risk["risk"],
        "score": risk["score"],
        "riskDetail": risk,
        "assurance": _assurance(session, risk),
        "breakdown": _breakdown(risk),
        "integritySummary": summary,
        "summary": summary,
        "policy": json.loads(session.policy_json or "{}"),
        "correlations": correlations,
        "events": events,
        "submissionCount": sum(1 for event in events if event["type"] == "submission_saved"),
        "priority": priority,
        "incidents": incidents,
        "snapshots": [snapshot_json(row) for row in snapshots],
        "ruleVersion": risk["ruleVersion"],
    }


def reports_csv(reports: list[dict]) -> bytes:
    output = io.StringIO(newline="")
    fields = [
        "sessionId", "examId", "studentId", "displayName", "startedAt",
        "submittedAt", "risk", "score", "review", "integritySummary",
    ]
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for item in reports:
        risk_value = item["risk"]
        if isinstance(risk_value, dict):
            risk_value = risk_value.get("risk", "")
            score = item.get("score", item["risk"].get("score"))
        else:
            score = item.get("score", "")
        review_value = item["review"]
        if isinstance(review_value, dict):
            review_value = review_value.get("decision") or review_value.get("status")
        writer.writerow(
            {
                "sessionId": item["sessionId"],
                "examId": item["examId"],
                "studentId": item["studentId"],
                "displayName": item["displayName"],
                "startedAt": item["startedAt"],
                "submittedAt": item["submittedAt"] or "",
                "risk": risk_value,
                "score": score,
                "review": review_value,
                "integritySummary": item.get("integritySummary") or item.get("summary", ""),
            }
        )
    return output.getvalue().encode("utf-8")


def _wrap(text: str, width: int) -> list[str]:
    words, lines, line = text.split(), [], ""
    for word in words:
        if len(line) + len(word) + 1 > width:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    if line:
        lines.append(line)
    return lines or [""]


def _fmt_time(value: str | None) -> str:
    if not value:
        return "-"
    return value.replace("T", " ")[:19] + " UTC"


def report_pdf(report: dict, snapshot_paths: dict[int, str] | None = None) -> bytes:
    """Reviewer-facing PDF: priority first, then the incidents to check with their snapshots."""
    snapshot_paths = snapshot_paths or {}
    output = io.BytesIO()
    page = canvas.Canvas(output, pagesize=A4)
    width, height = A4
    margin = 48
    page.setTitle(f"Integrity report {report['sessionId']}")
    risk_value = report["risk"] if isinstance(report["risk"], str) else report["risk"]["risk"]
    score = report.get("score")
    if score is None and isinstance(report["risk"], dict):
        score = report["risk"].get("score")
    rule_version = report.get("ruleVersion")
    if not rule_version and isinstance(report.get("riskDetail"), dict):
        rule_version = report["riskDetail"].get("ruleVersion")
    review_value = report["review"]["decision"] if isinstance(report["review"], dict) else report["review"]
    priority = report.get("priority") or {}
    incidents = report.get("incidents") or []
    y = height - margin

    def ensure(space: float) -> None:
        nonlocal y
        if y - space < margin:
            page.showPage()
            y = height - margin

    def text(line: str, size: int = 10, bold: bool = False, color=colors.black, indent: float = 0) -> None:
        nonlocal y
        ensure(size + 6)
        page.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        page.setFillColor(color)
        page.drawString(margin + indent, y, line)
        y -= size + 5

    def image(snapshot_id: int, x: float, top: float, w: float, h: float) -> bool:
        path = snapshot_paths.get(snapshot_id)
        if not path:
            return False
        try:
            page.drawImage(ImageReader(path), x, top - h, w, h, preserveAspectRatio=True, anchor="c")
            page.setStrokeColor(colors.lightgrey)
            page.rect(x, top - h, w, h)
            return True
        except Exception:
            return False

    text("Secure Examination - Integrity Review Report", 16, bold=True)
    generated = datetime.now(timezone.utc).isoformat()[:19].replace("T", " ")
    text(f"Generated {generated} UTC", 9, color=colors.grey)
    y -= 6
    text(f"Student: {report['displayName']} ({report['studentId']})", 11)
    text(f"Exam: {report['examId']}    Session: {report['sessionId']}", 10)
    text(
        f"Started: {_fmt_time(report.get('startedAt'))}    Submitted: {_fmt_time(report.get('submittedAt'))}",
        10,
    )
    y -= 6

    level = str(priority.get("level", risk_value)).upper()
    tone = {
        "CRITICAL": colors.HexColor("#991b1b"),
        "HIGH": colors.HexColor("#b45309"),
        "MEDIUM": colors.HexColor("#a16207"),
    }.get(level, colors.HexColor("#166534"))
    text(f"Review priority: {level}  ({priority.get('score', 0)}/100)", 14, bold=True, color=tone)
    text(
        f"Risk {risk_value} (score {score}) | Evidence strength: {priority.get('evidenceStrength', 'n/a')} | "
        f"Corroborated incidents: {priority.get('corroboratedIncidents', 0)} | Review: {review_value}",
        9,
    )
    if priority.get("webcam"):
        uptime = priority.get("cameraUptime") or 0
        text(
            f"Webcam proctoring on | Camera uptime {round(uptime * 100)}% | "
            f"{priority.get('snapshotCount', 0)} snapshots kept (no video stored)",
            9,
        )
    for reason in priority.get("reasons", []):
        for line in _wrap(f"- {reason}", 95):
            text(line, 10, indent=6)
    y -= 4
    for line in _wrap(report.get("integritySummary") or report.get("summary", ""), 100):
        text(line, 9, color=colors.HexColor("#334155"))

    y -= 8
    text("Check these first", 13, bold=True)
    if not incidents:
        text("No incidents were recorded.", 10)
    for rank, incident in enumerate(incidents[:6], start=1):
        ensure(120)
        suffix = "" if incident["scored"] else "  (log only)"
        text(f"{rank}. {incident['title']}  - priority {incident['priority']}{suffix}", 11, bold=True)
        source = (
            "corroborated by " + ", ".join(incident["corroboratedBy"])
            if incident["corroboratedBy"]
            else "single source"
        )
        text(
            f"{_fmt_time(incident['startedAt'])} | {incident['durationSeconds']} s | "
            f"{incident['count']} event(s) | confidence {int(incident['confidence'] * 100)}% | {source}",
            8,
            color=colors.HexColor("#475569"),
            indent=14,
        )
        shots = incident.get("snapshotIds", [])[:3]
        if any(sid in snapshot_paths for sid in shots):
            ensure(98)
            x = margin + 14
            for sid in shots:
                if image(sid, x, y, 128, 90):
                    x += 138
            y -= 98
        y -= 4

    filmstrip = [snap for snap in report.get("snapshots", []) if snap["id"] in snapshot_paths][:16]
    if filmstrip:
        page.showPage()
        y = height - margin
        text("Snapshot timeline", 13, bold=True)
        text("Periodic and incident stills captured during the exam. Video was never recorded.", 9, color=colors.grey)
        y -= 4
        cols, w, h = 4, 118, 84
        row_top = y
        for index, snap in enumerate(filmstrip):
            col = index % cols
            if col == 0:
                ensure(h + 26)
                row_top = y
            x = margin + col * (w + 10)
            image(snap["id"], x, row_top, w, h)
            page.setFont("Helvetica", 7)
            page.setFillColor(colors.HexColor("#475569"))
            label = snap["kind"] + (f" - {snap['eventType']}" if snap.get("eventType") else "")
            page.drawString(x, row_top - h - 9, label[:30])
            page.drawString(x, row_top - h - 18, _fmt_time(snap["createdAt"])[11:])
            if col == cols - 1 or index == len(filmstrip) - 1:
                y = row_top - h - 26

    ensure(30)
    y -= 6
    text(
        f"Rule version: {rule_version or 'risk-v3.0'}. This report is evidence for a human reviewer,",
        8,
        color=colors.grey,
    )
    text("not an automatic finding of misconduct.", 8, color=colors.grey)
    page.save()
    return output.getvalue()
