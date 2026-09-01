"""
Reusable FastAPI dependencies: current user extraction, role guards.
"""
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.db.firestore_service import get_user_by_id
from app.models.user import RoleEnum, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        resolved_id = int(user_id) if str(user_id).isdigit() else str(user_id)
        user = get_user_by_id(resolved_id)
    except Exception:
        raise credentials_exception

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    return user


def require_role(*roles: RoleEnum):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        role_vals = [r.value.lower() if hasattr(r, "value") else str(r).lower() for r in roles]
        user_role = (
            current_user.role.value.lower()
            if hasattr(current_user.role, "value")
            else str(current_user.role).lower()
        )
        if user_role not in role_vals:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return role_checker


def get_client_ip(request: Request) -> str:
    if not request:
        return "unknown"
    headers = getattr(request, "headers", None)
    if headers:
        forwarded = headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    client = getattr(request, "client", None)
    if client and hasattr(client, "host"):
        return client.host
    return "unknown"
