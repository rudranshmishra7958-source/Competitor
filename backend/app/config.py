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


settings = Settings()
