import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.database import get_db
from app.dependencies import require_manager, require_any_active_role
from app.models.medicine import Medicine
from app.models.category import Category
from app.models.user import User
from app.schemas.medicine import MedicineCreate, MedicineUpdate, MedicineResponse
from app.services.inventory_service import get_sellable_stock_for_medicine

router = APIRouter(prefix="/medicines", tags=["Medicines"])


@router.get("", response_model=List[MedicineResponse])
def list_medicines(
    search: Optional[str] = Query(None, description="Search by medicine name or generic name"),
    category_id: Optional[uuid.UUID] = Query(None, description="Filter by category"),
    include_inactive: bool = Query(False, description="Include deactivated medicines"),
    current_user: User = Depends(require_any_active_role),
    db: Session = Depends(get_db)
):
    stmt = select(Medicine)
    if not include_inactive:
        stmt = stmt.where(Medicine.is_active == True)
    if category_id:
        stmt = stmt.where(Medicine.category_id == category_id)
    if search:
        search_pattern = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Medicine.name.ilike(search_pattern),
                Medicine.generic_name.ilike(search_pattern)
            )
        )

    medicines = db.scalars(stmt.order_by(Medicine.name.asc())).all()

    # Calculate sellable quantity dynamically from unexpired batches
    result = []
    for med in medicines:
        sellable = get_sellable_stock_for_medicine(db, med.id)
        resp = MedicineResponse(
            id=med.id,
            category_id=med.category_id,
            category_name=med.category.name if med.category else None,
            name=med.name,
            generic_name=med.generic_name,
            manufacturer=med.manufacturer,
            description=med.description,
            selling_price=med.selling_price,
            reorder_level=med.reorder_level,
            is_active=med.is_active,
            sellable_quantity=sellable,
            is_low_stock=(sellable <= med.reorder_level),
            created_at=med.created_at,
            updated_at=med.updated_at
        )
        result.append(resp)
    return result


@router.post("", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def create_medicine(
    med_in: MedicineCreate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    # Verify category exists
    cat = db.scalar(select(Category).where(Category.id == med_in.category_id))
    if not cat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    medicine = Medicine(
        category_id=med_in.category_id,
        name=med_in.name,
        generic_name=med_in.generic_name,
        manufacturer=med_in.manufacturer,
        description=med_in.description,
        selling_price=med_in.selling_price,
        reorder_level=med_in.reorder_level,
        is_active=True
    )
    db.add(medicine)
    db.commit()
    db.refresh(medicine)

    return MedicineResponse(
        id=medicine.id,
        category_id=medicine.category_id,
        category_name=cat.name,
        name=medicine.name,
        generic_name=medicine.generic_name,
        manufacturer=medicine.manufacturer,
        description=medicine.description,
        selling_price=medicine.selling_price,
        reorder_level=medicine.reorder_level,
        is_active=medicine.is_active,
        sellable_quantity=0,
        is_low_stock=True,
        created_at=medicine.created_at,
        updated_at=medicine.updated_at
    )


@router.get("/{med_id}", response_model=MedicineResponse)
def get_medicine_detail(
    med_id: uuid.UUID,
    current_user: User = Depends(require_any_active_role),
    db: Session = Depends(get_db)
):
    med = db.scalar(select(Medicine).where(Medicine.id == med_id))
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")

    sellable = get_sellable_stock_for_medicine(db, med.id)
    return MedicineResponse(
        id=med.id,
        category_id=med.category_id,
        category_name=med.category.name if med.category else None,
        name=med.name,
        generic_name=med.generic_name,
        manufacturer=med.manufacturer,
        description=med.description,
        selling_price=med.selling_price,
        reorder_level=med.reorder_level,
        is_active=med.is_active,
        sellable_quantity=sellable,
        is_low_stock=(sellable <= med.reorder_level),
        created_at=med.created_at,
        updated_at=med.updated_at
    )


@router.put("/{med_id}", response_model=MedicineResponse)
def update_medicine(
    med_id: uuid.UUID,
    med_in: MedicineUpdate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    med = db.scalar(select(Medicine).where(Medicine.id == med_id))
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")

    if med_in.category_id is not None:
        cat = db.scalar(select(Category).where(Category.id == med_in.category_id))
        if not cat:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        med.category_id = med_in.category_id

    if med_in.name is not None:
        med.name = med_in.name
    if med_in.generic_name is not None:
        med.generic_name = med_in.generic_name
    if med_in.manufacturer is not None:
        med.manufacturer = med_in.manufacturer
    if med_in.description is not None:
        med.description = med_in.description
    if med_in.selling_price is not None:
        med.selling_price = med_in.selling_price
    if med_in.reorder_level is not None:
        med.reorder_level = med_in.reorder_level
    if med_in.is_active is not None:
        med.is_active = med_in.is_active

    db.commit()
    db.refresh(med)

    sellable = get_sellable_stock_for_medicine(db, med.id)
    return MedicineResponse(
        id=med.id,
        category_id=med.category_id,
        category_name=med.category.name if med.category else None,
        name=med.name,
        generic_name=med.generic_name,
        manufacturer=med.manufacturer,
        description=med.description,
        selling_price=med.selling_price,
        reorder_level=med.reorder_level,
        is_active=med.is_active,
        sellable_quantity=sellable,
        is_low_stock=(sellable <= med.reorder_level),
        created_at=med.created_at,
        updated_at=med.updated_at
    )


@router.delete("/{med_id}", response_model=MedicineResponse)
def deactivate_medicine(
    med_id: uuid.UUID,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    med = db.scalar(select(Medicine).where(Medicine.id == med_id))
    if not med:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    med.is_active = False
    db.commit()
    db.refresh(med)

    sellable = get_sellable_stock_for_medicine(db, med.id)
    return MedicineResponse(
        id=med.id,
        category_id=med.category_id,
        category_name=med.category.name if med.category else None,
        name=med.name,
        generic_name=med.generic_name,
        manufacturer=med.manufacturer,
        description=med.description,
        selling_price=med.selling_price,
        reorder_level=med.reorder_level,
        is_active=med.is_active,
        sellable_quantity=sellable,
        is_low_stock=(sellable <= med.reorder_level),
        created_at=med.created_at,
        updated_at=med.updated_at
    )
