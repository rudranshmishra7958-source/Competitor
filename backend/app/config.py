from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./exam.db"
    jwt_secret: str = "dev-change-me"
    jwt_refresh_secret: str = "dev-refresh-change-me"
    cors_origins: str = "http://localhost:3000"
    redis_url: str = ""
    event_rate_per_sec: int = 8
    access_token_minutes: int = 20
    agent_token_minutes: int = 10
    refresh_token_days: int = 7
    cookie_secure: bool = False
    endpoint_grace_seconds: int = 30
    # Enables proctor-only demo helpers such as simulated sessions. Turn off in production.
    demo_mode: bool = True
    # Webcam stills (never video). Stored on disk, deleted after the retention window.
    snapshot_dir: str = "./data/snapshots"
    snapshot_max_bytes: int = 300_000
    snapshot_max_per_session: int = 400
    snapshot_retention_days: int = 180


settings = Settings()
