from app.db import SessionLocal
from app.models import User
from app.security import hash_password

SEED_USERS = [
    {
        "id": "u-stu-1",
        "role": "student",
        "display_name": "Asha Rao",
        "institutional_id": "STU001",
        "email": "student@college.edu",
        "password": "password",
    },
    {
        "id": "u-stu-2",
        "role": "student",
        "display_name": "Kabir Singh",
        "institutional_id": "STU002",
        "email": "kabir@college.edu",
        "password": "password",
    },
    {
        "id": "u-fac-1",
        "role": "admin",
        "display_name": "Dr. Mehta",
        "institutional_id": "FAC001",
        "email": "faculty@college.edu",
        "password": "password",
    },
]


def seed_users() -> None:
    db = SessionLocal()
    try:
        for row in SEED_USERS:
            if db.get(User, row["id"]):
                continue
            db.add(
                User(
                    id=row["id"],
                    role=row["role"],
                    display_name=row["display_name"],
                    institutional_id=row["institutional_id"],
                    email=row["email"],
                    password_hash=hash_password(row["password"]),
                )
            )
        db.commit()
    finally:
        db.close()
