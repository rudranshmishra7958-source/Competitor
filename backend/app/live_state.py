from collections import defaultdict, deque
from time import time

from app.config import settings

# Stand-in for Redis live session state (swap when REDIS_URL is set).
live_sessions: dict[str, dict] = {}
_buckets: dict[str, deque[float]] = defaultdict(deque)


def allow_event(session_id: str) -> bool:
    now = time()
    q = _buckets[session_id]
    while q and now - q[0] > 1:
        q.popleft()
    if len(q) >= settings.event_rate_per_sec:
        return False
    q.append(now)
    return True


def touch_session(session_id: str, student_id: str, exam_id: str, event_type: str, connected: bool = True) -> None:
    live_sessions[session_id] = {
        "sessionId": session_id,
        "studentId": student_id,
        "examId": exam_id,
        "latestAnomaly": event_type,
        "connected": connected,
        "updatedAt": time(),
    }


def mark_disconnected(session_id: str) -> None:
    if session_id in live_sessions:
        live_sessions[session_id]["connected"] = False
