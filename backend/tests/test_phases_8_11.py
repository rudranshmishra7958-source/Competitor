import os
from datetime import datetime, timedelta, timezone

os.environ["DATABASE_URL"] = "sqlite:///./test_exam.db"
os.environ["EVENT_RATE_PER_SEC"] = "3"
os.environ["ENDPOINT_GRACE_SECONDS"] = "0"
os.environ["JWT_SECRET"] = "test-secret-key-at-least-32-bytes-long"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.live_state import _buckets
from app.main import app
from app.seed import seed_users


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    seed_users()
    _buckets.clear()
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def login(client, identifier="STU001", password="password", role="student"):
    response = client.post(
        "/auth/login",
        json={"identifier": identifier, "password": password, "role": role},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def register(client, token, session_id="session-1", policy=None):
    response = client.post(
        "/sessions",
        headers=auth(token),
        json={
            "sessionId": session_id,
            "examId": "exam-1",
            "policy": policy or {},
            "expiresAt": (utcnow() + timedelta(hours=1)).isoformat() + "Z",
        },
    )
    assert response.status_code == 201
    return response.json()


def event(session_id="session-1", **changes):
    value = {
        "type": "visibility_hidden",
        "timestamp": utcnow().isoformat() + "Z",
        "examId": "exam-1",
        "studentId": "u-stu-1",
        "sessionId": session_id,
        "source": "browser",
        "metadata": {},
    }
    value.update(changes)
    return value


def test_event_rejects_impersonation_source_and_ownership(client):
    student = login(client)
    register(client, student)
    other = login(client, "STU002")

    assert client.post("/events", headers=auth(student), json=event(studentId="u-stu-2")).status_code == 403
    assert client.post("/events", headers=auth(student), json=event(source="endpoint")).status_code == 403
    assert client.post("/events", headers=auth(other), json=event()).status_code == 403


def test_agent_token_is_owned_and_endpoint_scoped(client):
    student = login(client)
    register(client, student)
    other = login(client, "STU002")
    assert client.post("/agent/token", headers=auth(other), json={"sessionId": "session-1"}).status_code == 403
    agent = client.post("/agent/token", headers=auth(student), json={"sessionId": "session-1"}).json()["access_token"]

    with client.websocket_connect(f"/ws/events?token={agent}") as socket:
        socket.send_json(event(source="browser"))
        assert socket.receive_json()["accepted"] is False
        socket.send_json(event(source="endpoint"))
        assert socket.receive_json()["accepted"] is True


def test_rate_limit(client):
    student = login(client)
    register(client, student)
    statuses = [client.post("/events", headers=auth(student), json=event()).status_code for _ in range(4)]
    assert statuses == [200, 200, 200, 429]


def test_review_timeline_and_dashboard(client):
    student = login(client)
    register(client, student)
    assert client.post("/events", headers=auth(student), json=event()).status_code == 200
    admin = login(client, "FAC001", role="admin")
    reviewed = client.patch(
        "/sessions/session-1/review",
        headers=auth(admin),
        json={"decision": "flagged", "note": "Needs review"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["reviewerId"] == "u-fac-1"
    timeline = client.get("/sessions/session-1/timeline", headers=auth(admin)).json()
    assert timeline["events"][0]["type"] == "visibility_hidden"
    assert client.get("/admin/dashboard", headers=auth(admin)).status_code == 200


def test_policy_log_only_correlation_burst_and_missing_endpoint(client):
    student = login(client)
    register(
        client,
        student,
        policy={"rules": {"clipboard_copy": "allow_but_log"}, "endpointRequired": True},
    )
    assert client.post(
        "/events", headers=auth(student), json=event(type="clipboard_copy")
    ).status_code == 200
    for _ in range(2):
        assert client.post(
            "/events", headers=auth(student), json=event(type="devtools_open")
        ).status_code == 200
    admin = login(client, "FAC001", role="admin")
    risk = client.get("/sessions/session-1/risk", headers=auth(admin)).json()
    assert risk["ruleVersion"].startswith("risk-v2")
    assert risk["why"]["allowButLog"][0]["type"] == "clipboard_copy"
    assert risk["why"]["endpointMissing"] is True
    assert all(item["type"] != "clipboard_copy" for item in risk["why"]["scored"])


def test_cross_source_correlation(client):
    student = login(client)
    register(client, student)
    assert client.post(
        "/events", headers=auth(student), json=event(type="devtools_open")
    ).status_code == 200
    agent = client.post(
        "/agent/token", headers=auth(student), json={"sessionId": "session-1"}
    ).json()["access_token"]
    with client.websocket_connect(f"/ws/events?token={agent}") as socket:
        socket.send_json(event(type="process_blacklisted", source="endpoint"))
        assert socket.receive_json()["accepted"] is True
    admin = login(client, "FAC001", role="admin")
    risk = client.get("/sessions/session-1/risk", headers=auth(admin)).json()
    assert risk["correlated"] == 1
    assert risk["why"]["correlations"][0]["browser"] == "devtools_open"


def test_repeated_event_burst_increases_risk(client):
    student = login(client)
    register(client, student)
    for _ in range(3):
        assert client.post(
            "/events", headers=auth(student), json=event(type="window_blur")
        ).status_code == 200
    admin = login(client, "FAC001", role="admin")
    risk = client.get("/sessions/session-1/risk", headers=auth(admin)).json()
    assert risk["why"]["bursts"] == [
        {"source": "browser", "type": "window_blur", "count": 3}
    ]


def test_reports_csv_and_pdf(client):
    student = login(client)
    register(client, student)
    admin = login(client, "FAC001", role="admin")
    detail = client.get("/reports/session-1", headers=auth(admin))
    assert "Integrity risk is" in detail.json()["integritySummary"]
    assert detail.json()["summary"] == detail.json()["integritySummary"]
    csv_response = client.get("/reports/export.csv", headers=auth(admin))
    assert csv_response.status_code == 200 and b"integritySummary" in csv_response.content
    pdf_response = client.get("/reports/session-1/export.pdf", headers=auth(admin))
    assert pdf_response.status_code == 200 and pdf_response.content.startswith(b"%PDF")


def test_live_board_and_submit_close_session(client):
    student = login(client)
    register(client, student)
    assert client.post("/events", headers=auth(student), json=event(type="submission_saved")).status_code == 200
    still_open = client.post("/events", headers=auth(student), json=event()).status_code
    assert still_open == 200
    submitted = client.post("/sessions/session-1/submit", headers=auth(student))
    assert submitted.status_code == 200
    assert submitted.json()["review"]["status"] == "unreviewed"
    assert client.post("/events", headers=auth(student), json=event()).status_code == 409
    admin = login(client, "FAC001", role="admin")
    live = client.get("/admin/live", headers=auth(admin)).json()
    assert live[0]["sessionId"] == "session-1"
    assert live[0]["risk"] in {"low", "medium", "high"}
    assert "status" in live[0]["review"]


def test_weak_password_is_rejected(client):
    token = login(client)
    failed = client.post(
        "/auth/change-password",
        headers=auth(token),
        json={"currentPassword": "password", "newPassword": "short"},
    )
    assert failed.status_code in {400, 422}


def test_refresh_rotation_logout_and_change_password(client):
    token = login(client)
    old_cookie = client.cookies.get("refresh_token")
    refreshed = client.post("/auth/refresh")
    assert refreshed.status_code == 200
    assert client.cookies.get("refresh_token") != old_cookie
    changed = client.post(
        "/auth/change-password",
        headers=auth(refreshed.json()["access_token"]),
        json={"currentPassword": "password", "newPassword": "a-new-password"},
    )
    assert changed.status_code == 200
    assert client.post(
        "/auth/login",
        json={"identifier": "STU001", "password": "a-new-password", "role": "student"},
    ).status_code == 200
    assert client.post("/auth/logout").status_code == 204


def test_progressive_lockout_and_security_alerts(client):
    for _ in range(5):
        assert client.post(
            "/auth/login",
            json={"identifier": "STU001", "password": "wrong", "role": "student"},
        ).status_code == 401
    assert client.post(
        "/auth/login",
        json={"identifier": "STU001", "password": "password", "role": "student"},
    ).status_code == 401
    admin = login(client, "FAC001", role="admin")
    alerts = client.get("/admin/security/alerts", headers=auth(admin))
    assert alerts.status_code == 200
    assert len(alerts.json()) >= 5
