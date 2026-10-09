# Backend (FastAPI)

Phases 8–11 backend: authenticated exam sessions and browser/endpoint
ingestion, live administration and review, policy-aware risk v2, reports,
Argon2 passwords, progressive lockout, login audits, and rotating refresh
tokens.

SQLite startup uses a small additive migration helper so existing users and
monitor events remain usable. Use a full migration system for production.
Live presence is derived from persisted heartbeat timestamps.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health: `GET http://localhost:8000/health`

Seed logins match the frontend demo users (`STU001` / `FAC001`, password `password`).

Key routes:

- `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/change-password`
- `POST /sessions`, `/events`, `/agent/token`; `WS /ws/events?token=...`
- `GET /admin/sessions/live`, `/admin/dashboard`; `WS /ws/admin?token=...`
- `GET /sessions/{id}/timeline`, `PATCH /sessions/{id}/review`
- `GET /reports`, `/reports/{id}`, `/reports/export.csv`,
  `/reports/{id}/export.pdf`

Run tests with `python -m pytest -q`. Test databases are dropped and recreated;
the development database is never dropped automatically.
