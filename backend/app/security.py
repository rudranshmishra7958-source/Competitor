import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

bearer = HTTPBearer(auto_error=False)
password_hasher = PasswordHash.recommended()


def password_is_strong(password: str) -> bool:
    if len(password) < 12 or len(password) > 256:
        return False
    classes = sum(
        [
            any(ch.islower() for ch in password),
            any(ch.isupper() for ch in password),
            any(ch.isdigit() for ch in password),
            any(not ch.isalnum() for ch in password),
        ]
    )
    return classes >= 2


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def _legacy_hash(password: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), b"exam-salt", 120_000).hex()


def verify_password(password: str, stored: str) -> tuple[bool, str | None]:
    if stored.startswith("$"):
        try:
            valid, updated = password_hasher.verify_and_update(password, stored)
            return valid, updated
        except Exception:
            return False, None
    valid = hmac.compare_digest(_legacy_hash(password), stored)
    return valid, hash_password(password) if valid else None


def create_token(user: User, minutes: int | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user.id,
        "role": user.role,
        "typ": "access",
        "iat": now,
        "exp": now + timedelta(minutes=minutes or settings.access_token_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_agent_token(user: User, session_id: str) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub": user.id,
            "role": "student",
            "typ": "agent",
            "source": "endpoint",
            "session_id": session_id,
            "iat": now,
            "exp": now + timedelta(minutes=settings.agent_token_minutes),
        },
        settings.jwt_secret,
        algorithm="HS256",
    )


def decode_token(token: str, expected_type: str | None = None) -> dict:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid authentication") from exc
    if expected_type and data.get("typ") != expected_type:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return data


def new_refresh_token() -> tuple[str, str, str]:
    raw = secrets.token_urlsafe(48)
    return raw, token_digest(raw), str(uuid.uuid4())


def token_digest(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    data = decode_token(creds.credentials, "access")
    user = db.get(User, data.get("sub"))
    if not user or not user.active:
        raise HTTPException(status_code=401, detail="Invalid authentication")
    return user


def student_user(user: User = Depends(current_user)) -> User:
    if user.role != "student":
        raise HTTPException(status_code=403, detail="Student only")
    return user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user
