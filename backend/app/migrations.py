"""Small additive migration helper for the development SQLite database.

Production deployments should use a real migration system.  This helper exists
so older phase databases can boot without losing their monitor event history.
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.db import Base

SCHEMA_VERSION = 11

SQLITE_COLUMNS: dict[str, dict[str, str]] = {
    "users": {
        "must_reset_password": "BOOLEAN NOT NULL DEFAULT 0",
        "failed_attempts": "INTEGER NOT NULL DEFAULT 0",
        "locked_until": "DATETIME",
        "password_changed_at": "DATETIME",
        "active": "BOOLEAN NOT NULL DEFAULT 1",
    },
    "monitor_events": {
        "received_at": "DATETIME",
        "clock_skew_ms": "INTEGER NOT NULL DEFAULT 0",
    },
}


def migrate_schema(engine: Engine) -> None:
    Base.metadata.create_all(bind=engine)
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    with engine.begin() as connection:
        for table, additions in SQLITE_COLUMNS.items():
            if table not in inspector.get_table_names():
                continue
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, ddl in additions.items():
                if name not in existing:
                    connection.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{name}" {ddl}'))
        connection.execute(
            text("UPDATE monitor_events SET received_at = timestamp WHERE received_at IS NULL")
        )
        connection.execute(
            text(
                "CREATE TABLE IF NOT EXISTS schema_version "
                "(id INTEGER PRIMARY KEY, version INTEGER NOT NULL)"
            )
        )
        connection.execute(
            text(
                "INSERT INTO schema_version(id, version) VALUES (1, :version) "
                "ON CONFLICT(id) DO UPDATE SET version = excluded.version"
            ),
            {"version": SCHEMA_VERSION},
        )
