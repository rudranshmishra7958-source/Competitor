from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import SessionLocal, engine
from app.migrations import migrate_schema
from app.proctoring import purge_expired_snapshots
from app.proctoring import router as proctoring_router
from app.routes import router
from app.seed import seed_users

migrate_schema(engine)
seed_users()
with SessionLocal() as _db:
    purge_expired_snapshots(_db)

app = FastAPI(title="Secure Examination Platform", version="0.12.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(proctoring_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "phase": "12"}
