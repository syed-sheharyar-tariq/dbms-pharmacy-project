import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from app.database import get_db
from app.auth import verify_supabase_jwt
from app.dependencies import get_current_user, require_manager, security
from app.models.user import User
from app.schemas.user import UserProfileSync, UserResponse, UserUpdate, UserCreate

router = APIRouter(prefix="/auth", tags=["Authentication & Profiles"])


@router.post("/profile/sync", response_model=UserResponse)
def sync_user_profile(
    profile_data: UserProfileSync,
    credentials = Depends(security),
    db: Session = Depends(get_db)
):
    """
    Safely creates or synchronizes user profile after Supabase sign-in.
    Role cannot be self-assigned. First user in the database is automatically
    bootstrapped as Manager. Subsequent users default to Cashier or Stock Handler
    as configured by Manager.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials"
        )

    payload = verify_supabase_jwt(credentials.credentials)
    sub = payload.get("sub")
    email = payload.get("email", "")

    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    auth_uuid = uuid.UUID(sub)
    user = db.scalar(select(User).where(User.auth_id == auth_uuid))

    if user:
        # Update display name / contact, and apply requested role if specified during onboarding/registration
        user.name = profile_data.name
        if profile_data.contact is not None:
            user.contact = profile_data.contact
        if profile_data.requested_role:
            user.role = profile_data.requested_role
        db.commit()
        db.refresh(user)
        return user

    # First user bootstrap: If no users exist, assign Manager role
    total_users_count = db.scalar(select(func.count(User.id))) or 0
    if profile_data.requested_role:
        assigned_role = profile_data.requested_role
    elif total_users_count == 0:
        assigned_role = "Manager"
    else:
        assigned_role = "Cashier"

    new_user = User(
        auth_id=auth_uuid,
        name=profile_data.name,
        email=email or f"{auth_uuid}@pharmacy.local",
        contact=profile_data.contact,
        role=assigned_role,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns current active authenticated profile and role."""
    return current_user


@router.get("/users", response_model=List[UserResponse])
def list_users(
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """Manager-only: List all staff user accounts."""
    users = db.scalars(select(User).order_by(User.created_at.asc())).all()
    return users


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user_role_status(
    user_id: uuid.UUID,
    update_data: UserUpdate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """Manager-only: Update user role or activate/deactivate account."""
    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if update_data.name is not None:
        user.name = update_data.name
    if update_data.contact is not None:
        user.contact = update_data.contact
    if update_data.role is not None:
        user.role = update_data.role
    if update_data.is_active is not None:
        user.is_active = update_data.is_active

    db.commit()
    db.refresh(user)
    return user
