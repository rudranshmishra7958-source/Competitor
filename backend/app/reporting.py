import csv
import io
import json
from datetime import datetime, timedelta, timezone

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.models import ExamSession, MonitorEventRow, ReviewDecision, User
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
        "why": risk["why"],
        "ruleVersion": risk["ruleVersion"],
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


def report_pdf(report: dict) -> bytes:
    output = io.BytesIO()
    page = canvas.Canvas(output, pagesize=letter)
    page.setTitle(f"Integrity report {report['sessionId']}")
    risk_value = report["risk"] if isinstance(report["risk"], str) else report["risk"]["risk"]
    score = report.get("score")
    if score is None and isinstance(report["risk"], dict):
        score = report["risk"].get("score")
    rule_version = report.get("ruleVersion")
    if not rule_version and isinstance(report.get("riskDetail"), dict):
        rule_version = report["riskDetail"].get("ruleVersion")
    review_value = report["review"]["decision"] if isinstance(report["review"], dict) else report["review"]
    lines = [
        "Secure Examination Integrity Report",
        f"Generated: {datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')}",
        f"Session: {report['sessionId']}",
        f"Exam: {report['examId']}",
        f"Student: {report['displayName']} ({report['studentId']})",
        f"Risk: {risk_value} ({score})",
        f"Rule version: {rule_version or 'risk-v2.0'}",
        f"Review: {review_value}",
        "",
        report.get("integritySummary") or report.get("summary", ""),
    ]
    y = 750
    for line in lines:
        while len(line) > 95:
            page.drawString(54, y, line[:95])
            line, y = line[95:], y - 16
        page.drawString(54, y, line)
        y -= 18
    page.save()
    return output.getvalue()
