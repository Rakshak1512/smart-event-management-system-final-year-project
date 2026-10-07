import logging
from firebase_admin import auth
from app.core.security import hash_password, verify_password
from app.db import firestore_service as db_service
from app.models.user import RoleEnum

logger = logging.getLogger("app.seed")

TEST_USERS = [
    {
        "name": "Student Demo",
        "email": "student@test.com",
        "password": "Student@123",
        "role": RoleEnum.student,
        "registration_number": "21CS001",
        "department": "Computer Science",
        "semester": "6",
    },
    {
        "name": "Faculty Demo",
        "email": "faculty@test.com",
        "password": "Faculty@123",
        "role": RoleEnum.faculty,
        "department": "Computer Science",
    },
    {
        "name": "Volunteer Demo",
        "email": "volunteer@test.com",
        "password": "Volunteer@123",
        "role": RoleEnum.volunteer,
        "department": "Computer Science",
    },
    {
        "name": "Admin Demo",
        "email": "admin@test.com",
        "password": "Admin@123",
        "role": RoleEnum.admin,
        "registration_number": "ADM-001",
        "admin_id": "ADM-001",
    },
]


TEST_USER_NAME_MAP = {item["email"].strip().lower(): item["name"] for item in TEST_USERS}


def _sync_firebase_user(email: str, password: str) -> None:
    """Create/update demo credentials in Firebase Authentication."""
    try:
        existing = None
        try:
            existing = auth.get_user_by_email(email)
        except auth.UserNotFoundError:
            existing = None

        if existing:
            auth.update_user(
                existing.uid,
                password=password,
                email_verified=True,
                display_name=TEST_USER_NAME_MAP.get(email, existing.display_name),
            )
        else:
            auth.create_user(
                email=email,
                password=password,
                email_verified=True,
                display_name=TEST_USER_NAME_MAP.get(email),
            )
        logger.info("Firebase demo user synchronized: %s", email)
    except Exception as e:
        logger.error("Failed to sync Firebase demo user %s: %s", email, e)


def seed_test_users():
    """
    Idempotently seeds development and demo user accounts in the database.
    Never logs raw passwords.
    Ensures correct password hashes and verified/active flags are set.
    """
    for item in TEST_USERS:
        clean_email = item["email"].strip().lower()
        role = item["role"]
        try:
            existing = db_service.get_user_by_email(clean_email)
            if not existing:
                hashed = hash_password(item["password"])
                db_service.create_user(
                    name=item["name"],
                    email=clean_email,
                    hashed_password=hashed,
                    role=role,
                    registration_number=item.get("registration_number"),
                    admin_id=item.get("admin_id"),
                    department=item.get("department"),
                    semester=item.get("semester"),
                    is_email_verified=True,
                    is_active=True,
                )
                logger.info("Demo user seeded: %s (%s)", clean_email, role.value)
            else:
                updates = {}
                if not verify_password(item["password"], existing.hashed_password):
                    updates["hashed_password"] = hash_password(item["password"])
                if not existing.is_email_verified:
                    updates["is_email_verified"] = True
                if not existing.is_active:
                    updates["is_active"] = True

                existing_role_str = (
                    existing.role.value if hasattr(existing.role, "value") else str(existing.role)
                ).lower()
                if existing_role_str != role.value.lower():
                    updates["role"] = role.value

                if item.get("admin_id") and not getattr(existing, "admin_id", None):
                    updates["admin_id"] = item["admin_id"]

                if updates:
                    db_service.update_user(existing.id, updates)
                    logger.info("Demo user synchronized: %s (%s)", clean_email, role.value)
            _sync_firebase_user(clean_email, item["password"])
        except Exception as e:
            logger.error("Failed to seed demo user %s: %s", clean_email, e)
