import hashlib
import hmac
import random
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
import bcrypt
if not hasattr(bcrypt, "__about__"):
    class About:
        __version__ = getattr(bcrypt, "__version__", "4.1.3")
    bcrypt.__about__ = About()

from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None




def generate_otp(length: int = None) -> str:
    """Generate a cryptographically secure 6-digit numeric OTP."""
    target_len = length or settings.OTP_LENGTH or 6
    return "".join(secrets.choice(string.digits) for _ in range(target_len))


def hash_otp(otp_code: str) -> str:
    """Create a secure HMAC-SHA256 digest of the OTP code."""
    clean_otp = str(otp_code).strip()
    key = (settings.SECRET_KEY or "eventsphere-otp-secret").encode("utf-8")
    return hmac.new(key, clean_otp.encode("utf-8"), hashlib.sha256).hexdigest()


def verify_otp_hash(plain_otp: str, hashed_otp: str) -> bool:
    """Compare plain OTP against hashed OTP using constant-time comparison."""
    if not plain_otp or not hashed_otp:
        return False
    computed = hash_otp(plain_otp)
    return hmac.compare_digest(computed, str(hashed_otp).strip())
