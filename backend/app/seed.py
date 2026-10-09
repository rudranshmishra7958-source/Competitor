from app.db import SessionLocal
from app.models import User
from app.security import hash_password

# Demo accounts. Every password is "password"; never seed these outside development.
_STUDENTS = [
    ("u-stu-1", "Asha Rao", "STU001", "student@college.edu"),
    ("u-stu-2", "Kabir Singh", "STU002", "kabir@college.edu"),
    ("u-stu-3", "Meera Iyer", "STU003", "meera@college.edu"),
    ("u-stu-4", "Rohan Das", "STU004", "rohan@college.edu"),
    ("u-stu-5", "Priya Nair", "STU005", "priya@college.edu"),
    ("u-stu-6", "Arjun Patel", "STU006", "arjun@college.edu"),
    ("u-stu-7", "Sara Khan", "STU007", "sara@college.edu"),
    ("u-stu-8", "Vikram Joshi", "STU008", "vikram@college.edu"),
]
_FACULTY = [
    ("u-fac-1", "Dr. Mehta", "FAC001", "faculty@college.edu"),
    ("u-fac-2", "Prof. Banerjee", "FAC002", "proctor@college.edu"),
]

SEED_USERS = [
    {
        "id": uid,
        "role": "student",
        "display_name": name,
        "institutional_id": inst,
        "email": email,
        "password": "password",
    }
    for uid, name, inst, email in _STUDENTS
] + [
    {
        "id": uid,
        "role": "admin",
        "display_name": name,
        "institutional_id": inst,
        "email": email,
        "password": "password",
    }
    for uid, name, inst, email in _FACULTY
]

# Students the proctor's "simulate" button may use, so real demo logins stay clean.
SIMULATION_STUDENT_IDS = [uid for uid, *_ in _STUDENTS[2:]]


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
