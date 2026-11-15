import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_manager, require_any_active_role
from app.models.category import Category
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryResponse])
def list_categories(
    include_inactive: bool = False,
    current_user: User = Depends(require_any_active_role),
    db: Session = Depends(get_db)
):
    stmt = select(Category)
    if not include_inactive:
        stmt = stmt.where(Category.is_active == True)
    return db.scalars(stmt.order_by(Category.name.asc())).all()


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    cat_in: CategoryCreate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    existing = db.scalar(select(Category).where(Category.name == cat_in.name))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{cat_in.name}' already exists"
        )
    category = Category(name=cat_in.name, description=cat_in.description, is_active=True)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{cat_id}", response_model=CategoryResponse)
def update_category(
    cat_id: uuid.UUID,
    cat_in: CategoryUpdate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    cat = db.scalar(select(Category).where(Category.id == cat_id))
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if cat_in.name is not None and cat_in.name != cat.name:
        existing = db.scalar(select(Category).where(Category.name == cat_in.name))
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Name already taken")
        cat.name = cat_in.name

    if cat_in.description is not None:
        cat.description = cat_in.description
    if cat_in.is_active is not None:
        cat.is_active = cat_in.is_active

    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{cat_id}", response_model=CategoryResponse)
def deactivate_category(
    cat_id: uuid.UUID,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """Soft deactivation to preserve relational integrity."""
    cat = db.scalar(select(Category).where(Category.id == cat_id))
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    cat.is_active = False
    db.commit()
    db.refresh(cat)
    return cat
