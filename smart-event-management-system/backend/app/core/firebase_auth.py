"""Firebase Authentication helpers for verifying web-client ID tokens."""
from typing import Any, Dict

from firebase_admin import auth

from app.core.firebase import init_firebase


def verify_firebase_id_token(id_token: str) -> Dict[str, Any]:
    if not id_token or not str(id_token).strip():
        raise ValueError("Firebase ID token is required")

    # Ensure the Admin SDK is initialized before token verification.
    init_firebase()
    decoded = auth.verify_id_token(str(id_token).strip())

    email = str(decoded.get("email") or "").strip().lower()
    if not email:
        raise ValueError("Firebase token does not contain an email address")

    decoded["email"] = email
    decoded["email_verified"] = bool(decoded.get("email_verified", False))
    return decoded
