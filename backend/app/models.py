from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    role: Mapped[str] = mapped_column(String(16))
    display_name: Mapped[str] = mapped_column(String(120))
    institutional_id: Mapped[str] = mapped_column(String(64), index=True)
    email: Mapped[str] = mapped_column(String(200), index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    must_reset_password: Mapped[bool] = mapped_column(Boolean, default=False)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    password_changed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class ExamSession(Base):
    __tablename__ = "exam_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    exam_id: Mapped[str] = mapped_column(String(64), index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    policy_json: Mapped[str] = mapped_column(Text, default="{}")
    started_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime)
    browser_connected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    browser_disconnected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    endpoint_connected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    endpoint_disconnected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class MonitorEventRow(Base):
    __tablename__ = "monitor_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    type: Mapped[str] = mapped_column(String(64), index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True)
    exam_id: Mapped[str] = mapped_column(String(64), index=True)
    student_id: Mapped[str] = mapped_column(String(64), index=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    source: Mapped[str] = mapped_column(String(16))
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    received_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    clock_skew_ms: Mapped[int] = mapped_column(Integer, default=0)


class ReviewDecision(Base):
    __tablename__ = "review_decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    decision: Mapped[str] = mapped_column(String(16), default="unreviewed", index=True)
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class RiskSnapshot(Base):
    __tablename__ = "risk_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    rule_version: Mapped[str] = mapped_column(String(32), index=True)
    score: Mapped[int] = mapped_column(Integer)
    level: Mapped[str] = mapped_column(String(16), index=True)
    details_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    family_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    expires_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    replaced_by_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)


class LoginAudit(Base):
    __tablename__ = "login_audits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    identifier: Mapped[str] = mapped_column(String(200), index=True)
    success: Mapped[bool] = mapped_column(Boolean, index=True)
    reason: Mapped[str] = mapped_column(String(64), index=True)
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(300), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)


class SessionSnapshot(Base):
    """A single webcam still. Video is never uploaded or stored; only these frames are."""

    __tablename__ = "session_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(64), index=True)
    student_id: Mapped[str] = mapped_column(String(64), index=True)
    kind: Mapped[str] = mapped_column(String(16))  # reference | periodic | incident
    event_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    path: Mapped[str] = mapped_column(String(260))
    bytes: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, index=True)
