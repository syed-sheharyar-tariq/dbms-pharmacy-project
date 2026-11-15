import uuid
from typing import List, Callable
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.auth import verify_supabase_jwt
from app.models.user import User

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Validates Bearer token and resolves active User profile from database."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = verify_supabase_jwt(token)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token subject (sub) missing",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        auth_uuid = uuid.UUID(sub)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(User).where(User.auth_id == auth_uuid)
    user = db.scalar(stmt)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile not initialized in pharmacy system. Contact Manager to sync profile.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User profile is deactivated. Access denied.",
        )

    return user


def require_role(allowed_roles: List[str]) -> Callable:
    """Role-based access dependency generator."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted for role '{current_user.role}'. Required: {allowed_roles}",
            )
        return current_user
    return role_checker


# Specific Role Dependencies
require_manager = require_role(["Manager"])
require_cashier = require_role(["Manager", "Cashier"])
require_stock = require_role(["Manager", "Stock Handler"])
require_any_active_role = require_role(["Manager", "Cashier", "Stock Handler"])
