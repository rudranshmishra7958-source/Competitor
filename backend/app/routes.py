import asyncio
import json
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

import anyio
from fastapi import (
    APIRouter, Cookie, Depends, HTTPException, Request, Response, WebSocket,
    WebSocketDisconnect,
)
from fastapi.responses import StreamingResponse
from pydantic import AliasChoices, BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.config import settings
from app.db import SessionLocal, get_db
from app.live_state import allow_event
from app.models import (
    ExamSession, LoginAudit, MonitorEventRow, RefreshToken, ReviewDecision, User,
)
from app.reporting import (
    _timeline_events,
    application_from_metadata,
    report_dto,
    report_pdf,
    reports_csv,
    session_live_row,
)
from app.risk import classify_event, score_session
from app.security import (
    admin_user, create_agent_token, create_token, current_user, decode_token,
    hash_password, new_refresh_token, password_is_strong, student_user, token_digest,
    verify_password,
)

router = APIRouter()
REFRESH_COOKIE = "refresh_token"


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_time(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid timestamp") from exc


class LoginBody(BaseModel):
    identifier: str
    password: str
    role: str | None = None


class ChangePasswordBody(BaseModel):
    currentPassword: str = Field(validation_alias=AliasChoices("currentPassword", "current_password"))
    newPassword: str = Field(
        min_length=12,
        max_length=256,
        validation_alias=AliasChoices("newPassword", "new_password"),
    )


class SessionBody(BaseModel):
    model_config = {"extra": "ignore"}

    sessionId: str = Field(min_length=1, max_length=64)
    examId: str = Field(min_length=1, max_length=64)
    policy: dict = Field(default_factory=dict)
    startedAt: str | None = None
    expiresAt: str | None = None
    studentId: str | None = None
    submittedAt: str | None = None


class AgentTokenBody(BaseModel):
    sessionId: str


class EventBody(BaseModel):
    type: str = Field(min_length=1, max_length=64)
    timestamp: str
    examId: str
    studentId: str
    sessionId: str
    source: Literal["browser", "endpoint"] = "browser"
    metadata: dict = Field(default_factory=dict)


class ReviewBody(BaseModel):
    decision: Literal["unreviewed", "flagged", "cleared"] = Field(
        validation_alias=AliasChoices("decision", "status")
    )
    note: str = Field(default="", max_length=4000)


def _user_json(user: User) -> dict:
    return {
        "role": user.role,
        "displayName": user.display_name,
        "identifier": user.institutional_id,
        "userId": user.id,
        "institutionalId": user.institutional_id,
        "email": user.email,
        "mustResetPassword": user.must_reset_password,
    }


def _set_refresh_cookie(response: Response, raw: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        raw,
        max_age=settings.refresh_token_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/auth",
    )


def _issue_refresh(db: Session, user: User, family_id: str | None = None) -> str:
    raw, digest, generated_family = new_refresh_token()
    db.add(
        RefreshToken(
            token_hash=digest,
            family_id=family_id or generated_family,
            user_id=user.id,
            created_at=utcnow(),
            expires_at=utcnow() + timedelta(days=settings.refresh_token_days),
        )
    )
    return raw


def _audit(db: Session, body: LoginBody, request: Request, user: User | None, success: bool, reason: str) -> None:
    db.add(
        LoginAudit(
            user_id=user.id if user else None,
            identifier=body.identifier.strip().lower()[:200],
            success=success,
            reason=reason,
            ip_address=(request.client.host if request.client else "")[:64],
            user_agent=request.headers.get("user-agent", "")[:300],
            created_at=utcnow(),
        )
    )


@router.post("/auth/login")
def login(body: LoginBody, request: Request, response: Response, db: Session = Depends(get_db)):
    key = body.identifier.strip().lower()
    query = db.query(User).filter(
        or_(User.institutional_id.ilike(key), User.email.ilike(key))
    )
    if body.role:
        query = query.filter(User.role == body.role)
    user = query.first()
    now = utcnow()
    valid = False
    upgraded = None
    if user and user.active and (not user.locked_until or user.locked_until <= now):
        valid, upgraded = verify_password(body.password, user.password_hash)
    if not valid:
        if user:
            user.failed_attempts += 1
            if user.failed_attempts >= 10:
                user.locked_until = now + timedelta(minutes=30)
            elif user.failed_attempts >= 8:
                user.locked_until = now + timedelta(minutes=5)
            elif user.failed_attempts >= 5:
                user.locked_until = now + timedelta(minutes=1)
        _audit(db, body, request, user, False, "invalid_or_locked")
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user.failed_attempts = 0
    user.locked_until = None
    if upgraded:
        user.password_hash = upgraded
        user.password_changed_at = now
    raw_refresh = _issue_refresh(db, user)
    _audit(db, body, request, user, True, "success")
    db.commit()
    _set_refresh_cookie(response, raw_refresh)
    payload = _user_json(user)
    return {
        "access_token": create_token(user),
        "token_type": "bearer",
        "user": payload,
        "must_reset_password": user.must_reset_password,
        "mustResetPassword": user.must_reset_password,
    }


@router.post("/auth/refresh")
def refresh(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    db: Session = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    digest = token_digest(refresh_token)
    stored = db.query(RefreshToken).filter_by(token_hash=digest).first()
    if not stored or stored.expires_at <= utcnow():
        raise HTTPException(status_code=401, detail="Invalid authentication")
    if stored.revoked_at:
        db.query(RefreshToken).filter_by(family_id=stored.family_id).update(
            {"revoked_at": utcnow()}, synchronize_session=False
        )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid authentication")
    user = db.get(User, stored.user_id)
    if not user or not user.active:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    raw = _issue_refresh(db, user, stored.family_id)
    stored.revoked_at = utcnow()
    stored.replaced_by_hash = token_digest(raw)
    db.commit()
    _set_refresh_cookie(response, raw)
    return {"access_token": create_token(user), "token_type": "bearer"}


@router.post("/auth/logout", status_code=204)
def logout(
    response: Response,
    refresh_token: str | None = Cookie(default=None, alias=REFRESH_COOKIE),
    db: Session = Depends(get_db),
):
    if refresh_token:
        stored = db.query(RefreshToken).filter_by(token_hash=token_digest(refresh_token)).first()
        if stored:
            stored.revoked_at = utcnow()
            db.commit()
    response.delete_cookie(REFRESH_COOKIE, path="/auth")


@router.post("/auth/change-password")
def change_password(
    body: ChangePasswordBody,
    user: Annotated[User, Depends(current_user)],
    db: Session = Depends(get_db),
):
    valid, _ = verify_password(body.currentPassword, user.password_hash)
    if not valid or body.currentPassword == body.newPassword or not password_is_strong(body.newPassword):
        raise HTTPException(status_code=400, detail="Password change failed")
    user.password_hash = hash_password(body.newPassword)
    user.password_changed_at = utcnow()
    user.must_reset_password = False
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": utcnow()}, synchronize_session=False)
    db.commit()
    return {"changed": True}


@router.post("/sessions", status_code=201)
@router.post("/sessions/register", status_code=201)
def register_session(
    body: SessionBody,
    user: Annotated[User, Depends(student_user)],
    db: Session = Depends(get_db),
):
    existing = db.query(ExamSession).filter_by(session_id=body.sessionId).first()
    if existing:
        if existing.student_id != user.id:
            raise HTTPException(status_code=403, detail="Session ownership mismatch")
        return _session_json(existing)
    now = utcnow()
    started = parse_time(body.startedAt) if body.startedAt else now
    expires = parse_time(body.expiresAt) if body.expiresAt else started + timedelta(hours=4)
    if expires <= started:
        raise HTTPException(status_code=422, detail="Session expiry must follow start")
    session = ExamSession(
        session_id=body.sessionId,
        exam_id=body.examId,
        student_id=user.id,
        policy_json=json.dumps(body.policy),
        started_at=started,
        expires_at=expires,
        last_seen_at=now,
        browser_connected_at=now,
    )
    db.add(session)
    db.add(
        ReviewDecision(
            session_id=body.sessionId,
            decision="unreviewed",
            note="",
            created_at=now,
            updated_at=now,
        )
    )
    db.commit()
    db.refresh(session)
    return _session_json(session)


@router.post("/agent/token")
def agent_token(
    body: AgentTokenBody,
    user: Annotated[User, Depends(student_user)],
    db: Session = Depends(get_db),
):
    session = db.query(ExamSession).filter_by(session_id=body.sessionId).first()
    if not session or session.student_id != user.id or session.expires_at <= utcnow():
        raise HTTPException(status_code=403, detail="Agent token unavailable")
    token = create_agent_token(user, session.session_id)
    return {
        "access_token": token,
        "token": token,
        "token_type": "bearer",
        "expires_in": settings.agent_token_minutes * 60,
        "source": "endpoint",
    }


def persist_event(
    db: Session,
    body: EventBody,
    student_id: str,
    allowed_source: str,
) -> MonitorEventRow | None:
    session = db.query(ExamSession).filter_by(session_id=body.sessionId).first()
    if (
        not session
        or session.student_id != student_id
        or body.studentId != student_id
        or body.examId != session.exam_id
        or body.source != allowed_source
    ):
        raise HTTPException(status_code=403, detail="Event scope mismatch")
    now = utcnow()
    if session.expires_at <= now or session.submitted_at:
        raise HTTPException(status_code=409, detail="Session is closed")
    if not allow_event(f"{body.sessionId}:{body.source}"):
        return None
    client_time = parse_time(body.timestamp)
    skew = int((client_time - now).total_seconds() * 1000)
    row = MonitorEventRow(
        type=body.type,
        timestamp=client_time,
        received_at=now,
        clock_skew_ms=skew,
        exam_id=session.exam_id,
        student_id=student_id,
        session_id=session.session_id,
        source=body.source,
        metadata_json=json.dumps(body.metadata),
    )
    db.add(row)
    session.last_seen_at = now
    if body.source == "browser":
        session.browser_connected_at = session.browser_connected_at or now
        session.browser_disconnected_at = None
    else:
        session.endpoint_connected_at = session.endpoint_connected_at or now
        session.endpoint_disconnected_at = None
    db.commit()
    db.refresh(row)
    payload = {"type": "session_updated", "sessionId": session.session_id}
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(admin_hub.broadcast(payload))
    except RuntimeError:
        try:
            anyio.from_thread.run(admin_hub.broadcast, payload)
        except RuntimeError:
            pass
    return row


def event_ack(db: Session, session_id: str, row: MonitorEventRow | None) -> dict:
    if row is None:
        return {"accepted": False, "rateLimited": True}
    session = db.query(ExamSession).filter_by(session_id=session_id).first()
    policy = json.loads(session.policy_json or "{}") if session else {}
    info = classify_event(row, policy)
    body: dict = {"accepted": True, "rateLimited": False}
    if info["scored"]:
        risk = score_session(db, session_id, persist=False)
        violation = {
            "scored": True,
            "effectiveType": info["effectiveType"],
            "pointsAdded": info["points"],
            "totalScore": risk["score"],
            "risk": risk["risk"],
        }
        application = application_from_metadata(row.metadata_json)
        if application:
            violation["application"] = application
        body["violation"] = violation
    return body


@router.post("/events")
def post_event(
    body: EventBody,
    user: Annotated[User, Depends(student_user)],
    db: Session = Depends(get_db),
):
    row = persist_event(db, body, user.id, "browser")
    if row is None:
        raise HTTPException(status_code=429, detail="Event rate exceeded")
    return event_ack(db, body.sessionId, row)


def _session_json(session: ExamSession) -> dict:
    now = utcnow()
    fresh = session.last_seen_at >= now - timedelta(seconds=30)
    return {
        "id": session.id,
        "sessionId": session.session_id,
        "examId": session.exam_id,
        "studentId": session.student_id,
        "policy": json.loads(session.policy_json or "{}"),
        "startedAt": session.started_at.isoformat() + "Z",
        "expiresAt": session.expires_at.isoformat() + "Z",
        "submittedAt": session.submitted_at.isoformat() + "Z" if session.submitted_at else None,
        "lastSeenAt": session.last_seen_at.isoformat() + "Z",
        "browserConnected": bool(fresh and session.browser_connected_at and not session.browser_disconnected_at),
        "endpointConnected": bool(fresh and session.endpoint_connected_at and not session.endpoint_disconnected_at),
    }


@router.get("/admin/live")
@router.get("/admin/sessions/live")
def live_board(_: Annotated[User, Depends(admin_user)], db: Session = Depends(get_db)):
    sessions = db.query(ExamSession).order_by(ExamSession.last_seen_at.desc()).limit(100).all()
    return [session_live_row(db, session) for session in sessions]


@router.get("/admin/dashboard")
def dashboard(_: Annotated[User, Depends(admin_user)], db: Session = Depends(get_db)):
    sessions = db.query(ExamSession).all()
    risks = [score_session(db, item.session_id, persist=False) for item in sessions]
    decisions = db.query(ReviewDecision).all()
    return {
        "totalSessions": len(sessions),
        "liveSessions": sum(_session_json(item)["browserConnected"] for item in sessions),
        "highRisk": sum(item["risk"] == "high" for item in risks),
        "unreviewed": sum(item.decision == "unreviewed" for item in decisions),
    }


@router.get("/admin/sessions")
def admin_sessions(_: Annotated[User, Depends(admin_user)], db: Session = Depends(get_db)):
    return [
        session_live_row(db, item)
        for item in db.query(ExamSession).order_by(ExamSession.started_at.desc()).all()
    ]


@router.get("/sessions/{session_id}")
def get_session(
    session_id: str,
    user: Annotated[User, Depends(current_user)],
    db: Session = Depends(get_db),
):
    session = db.query(ExamSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if user.role != "admin" and session.student_id != user.id:
        raise HTTPException(status_code=403, detail="Session ownership mismatch")
    return session_live_row(db, session)


@router.post("/sessions/{session_id}/submit")
def submit_session(
    session_id: str,
    user: Annotated[User, Depends(student_user)],
    db: Session = Depends(get_db),
):
    session = db.query(ExamSession).filter_by(session_id=session_id).first()
    if not session or session.student_id != user.id:
        raise HTTPException(status_code=403, detail="Session ownership mismatch")
    session.submitted_at = session.submitted_at or utcnow()
    db.commit()
    return session_live_row(db, session)


@router.get("/sessions/{session_id}/timeline")
@router.get("/admin/sessions/{session_id}/timeline")
def timeline(
    session_id: str,
    _: Annotated[User, Depends(admin_user)],
    db: Session = Depends(get_db),
):
    session = db.query(ExamSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    row = session_live_row(db, session)
    return {
        "session": row,
        "events": _timeline_events(db, session),
        "risk": score_session(db, session_id, persist=False),
    }


@router.patch("/sessions/{session_id}/review")
@router.patch("/admin/sessions/{session_id}/review")
def review_session(
    session_id: str,
    body: ReviewBody,
    reviewer: Annotated[User, Depends(admin_user)],
    db: Session = Depends(get_db),
):
    if not db.query(ExamSession).filter_by(session_id=session_id).first():
        raise HTTPException(status_code=404, detail="Session not found")
    review = db.query(ReviewDecision).filter_by(session_id=session_id).first()
    now = utcnow()
    if not review:
        review = ReviewDecision(session_id=session_id, created_at=now, updated_at=now)
        db.add(review)
    review.decision = body.decision
    review.note = body.note
    review.updated_at = now
    review.reviewer_id = reviewer.id if body.decision != "unreviewed" else None
    review.reviewed_at = now if body.decision != "unreviewed" else None
    db.commit()
    return {
        "sessionId": session_id,
        "decision": review.decision,
        "reviewerId": review.reviewer_id,
        "note": review.note,
        "reviewedAt": review.reviewed_at.isoformat() + "Z" if review.reviewed_at else None,
    }


@router.get("/sessions/{session_id}/risk")
def session_risk(
    session_id: str,
    _: Annotated[User, Depends(admin_user)],
    db: Session = Depends(get_db),
):
    if not db.query(ExamSession).filter_by(session_id=session_id).first():
        raise HTTPException(status_code=404, detail="Session not found")
    return score_session(db, session_id)


@router.get("/reports")
@router.get("/admin/reports")
def list_reports(_: Annotated[User, Depends(admin_user)], db: Session = Depends(get_db)):
    return [report_dto(db, item) for item in db.query(ExamSession).order_by(ExamSession.started_at.desc()).all()]


@router.get("/reports/export.csv")
@router.get("/admin/reports/export.csv")
def export_reports_csv(_: Annotated[User, Depends(admin_user)], db: Session = Depends(get_db)):
    reports = [report_dto(db, item) for item in db.query(ExamSession).order_by(ExamSession.started_at.desc()).all()]
    return StreamingResponse(
        iter([reports_csv(reports)]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="integrity-reports.csv"'},
    )


@router.get("/reports/{session_id}")
@router.get("/admin/reports/{session_id}")
def report_detail(
    session_id: str,
    _: Annotated[User, Depends(admin_user)],
    db: Session = Depends(get_db),
):
    session = db.query(ExamSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return report_dto(db, session)


@router.get("/reports/{session_id}/export.pdf")
@router.get("/admin/reports/{session_id}/export.pdf")
def export_report_pdf(
    session_id: str,
    _: Annotated[User, Depends(admin_user)],
    db: Session = Depends(get_db),
):
    session = db.query(ExamSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = report_pdf(report_dto(db, session))
    return StreamingResponse(
        iter([data]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{session_id}.pdf"'},
    )


@router.get("/reports/{session_id}/export.csv")
@router.get("/admin/reports/{session_id}/export.csv")
def export_report_csv(
    session_id: str,
    _: Annotated[User, Depends(admin_user)],
    db: Session = Depends(get_db),
):
    session = db.query(ExamSession).filter_by(session_id=session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    data = reports_csv([report_dto(db, session)])
    return StreamingResponse(
        iter([data]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{session_id}.csv"'},
    )


@router.get("/admin/security/alerts")
@router.get("/admin/security-alerts")
def security_alerts(_: Annotated[User, Depends(admin_user)], db: Session = Depends(get_db)):
    audits = (
        db.query(LoginAudit)
        .filter(LoginAudit.success.is_(False))
        .order_by(LoginAudit.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": item.id,
            "event": item.reason,
            "identifierHint": item.identifier,
            "userId": item.user_id,
            "identifier": item.identifier,
            "reason": item.reason,
            "ipAddress": item.ip_address,
            "createdAt": item.created_at.isoformat() + "Z",
        }
        for item in audits
    ]


class AdminHub:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()

    async def broadcast(self, payload: dict) -> None:
        stale = []
        for socket in self.connections:
            try:
                await socket.send_json(payload)
            except Exception:
                stale.append(socket)
        for socket in stale:
            self.connections.discard(socket)


admin_hub = AdminHub()


def _websocket_token(ws: WebSocket) -> str:
    token = ws.query_params.get("token", "")
    if token:
        return token
    header = ws.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return ""


@router.websocket("/ws/admin")
async def admin_socket(ws: WebSocket):
    token = _websocket_token(ws)
    db = SessionLocal()
    try:
        data = decode_token(token, "access")
        user = db.get(User, data.get("sub"))
        if not user or not user.active or user.role != "admin":
            raise HTTPException(status_code=403)
    except HTTPException:
        await ws.close(code=4401)
        db.close()
        return
    db.close()
    await ws.accept()
    admin_hub.connections.add(ws)
    try:
        while True:
            await ws.receive_text()
            await ws.send_json({"type": "pong"})
    except WebSocketDisconnect:
        admin_hub.connections.discard(ws)


@router.websocket("/ws/events")
async def ingest_events(ws: WebSocket):
    token = _websocket_token(ws)
    db = SessionLocal()
    source = ""
    session_scope = None
    student_id = ""
    try:
        data = decode_token(token)
        user = db.get(User, data.get("sub"))
        if not user or not user.active or user.role != "student":
            raise HTTPException(status_code=401)
        student_id = user.id
        if data.get("typ") == "access":
            source = "browser"
        elif data.get("typ") == "agent" and data.get("source") == "endpoint":
            source = "endpoint"
            session_scope = data.get("session_id")
        else:
            raise HTTPException(status_code=401)
    except HTTPException:
        await ws.close(code=4401)
        db.close()
        return
    await ws.accept()
    active_session = session_scope
    try:
        while True:
            body = EventBody.model_validate(await ws.receive_json())
            if session_scope and body.sessionId != session_scope:
                await ws.send_json({"accepted": False, "error": "Event scope mismatch"})
                continue
            active_session = body.sessionId
            try:
                row = persist_event(db, body, student_id, source)
                await ws.send_json(event_ack(db, body.sessionId, row))
            except HTTPException as exc:
                await ws.send_json({"accepted": False, "error": exc.detail})
    except WebSocketDisconnect:
        pass
    finally:
        if active_session:
            session = db.query(ExamSession).filter_by(session_id=active_session).first()
            if session:
                if source == "browser":
                    session.browser_disconnected_at = utcnow()
                else:
                    session.endpoint_disconnected_at = utcnow()
                db.commit()
        db.close()
