# Secure Examination Platform — Roadmap

## Domain (plain language)

This is a **college exam room in the browser**, not a webcam spy tool.

- **People:** the college provisions accounts. Students sign in with college ID or email; faculty with faculty ID or email. That proves someone knows the password, not that the enrolled person is physically at the desk.
- **An exam** is a scheduled test: title, start, duration, assigned students, MCQ and/or written questions, and a security policy.
- **Policy** never turns detection off. Each rule is **Enforce** (will count against integrity) or **Allow but log** (recorded, not scored). Camera is optional. Question/option order can be randomized per student.
- **MCQ sitting:** compatibility check, then questions. The clock is an **expiry timestamp** on the attempt. Answers autosave.
- **Written sitting:** photograph with **Open camera** (live preview + Capture) or upload a scan. Each save is a **new** record (`ocrText` stays empty for later OCR). Dark/blurry images warn but can still be kept.
- **Browser monitor:** while a sitting is open, the page records tab hide/show, focus, fullscreen, clipboard, right-click, and rough DevTools/leave attempts. Events stay local and are sent to FastAPI when it is running.
- **Endpoint agent:** a visible Windows status window reports executable names and environment state only. Closing it stops monitoring.
- **Reports:** faculty can export a reproducible integrity summary as PDF or CSV. The score is evidence for a human, not an automatic accusation.
- **Accounts:** failed logins lock progressively. Refresh cookies rotate. Passwords must be at least 12 characters to change.

## Locked decisions (Phase 0)

- **Identity (MVP):** college/faculty ID *or* institutional email + password. Accounts are admin-provisioned (no self-signup). Login proves credential possession, not physical identity. Photo/face capture can be added later as a session step without rewriting users/roles.
- **Auth (Phase 6):** JWT + refresh tokens; role claims `student` | `admin`. Forced password reset on first login and forgot-password via college email.
- **Detect always, policy scores:** security toggles are `enforce` | `allow_but_log`.
- **Camera:** optional per exam.
- **Browser multi-window/monitor:** best-effort (Fullscreen + Page Visibility + blur/focus).
- **Offline:** server-authoritative timer keeps running; client queues autosave; recommended 60s reconnect grace (Phase 6).
- **Written uploads:** include nullable `ocrText` so OCR can attach later without a migration.
- **Agent refusal:** default browser-only, lower assurance. Hard-block only when the exam policy requires the endpoint agent.
- **Retention:** default 24 months for telemetry + images (Phase 12).
- **Monitor event schema:** `type`, `timestamp`, `examId`, `studentId`, `sessionId`, `source` (`browser` | `endpoint`), `metadata`.

## Phases

| Phase | Status | Scope |
| --- | --- | --- |
| 0 Foundations | done | Monorepo, env, shared types |
| 1 Portal shells | done | Mock auth, admin/student nav |
| 2 Exam creation | done | Builder, policy toggles, randomization flag |
| 3 Quiz taking | done | Timer, autosave, compatibility check UI |
| 4 Written submissions | done | Photo upload, resubmit history |
| 5 JS browser monitor | done | Event capture, local buffer |
| 6 FastAPI + Redis/Postgres | done (SQLite + in-memory live) | JWT auth, WS/HTTP ingest, rate limits |
| 7 Risk engine v1 | done | Low/Medium/High + why breakdown |
| 8 Live admin dashboard | done | Grid, timeline, reviewer workflow |
| 9 Python endpoint agent | done | Name-only telemetry, visible status window |
| 10 Correlation v2 + reports | done | Integrity summary, PDF/CSV |
| 11 Credential hygiene | done | Lockout, rotating refresh, password change |
| 12 Hardening | planned | Retention, a11y, upload validation |
| 13+ Optional | later | Lockdown browser, OCR, LMS, mobile |
