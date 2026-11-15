import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_manager, require_stock
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])


@router.get("", response_model=List[SupplierResponse])
def list_suppliers(
    include_inactive: bool = False,
    current_user: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    stmt = select(Supplier)
    if not include_inactive:
        stmt = stmt.where(Supplier.is_active == True)
    return db.scalars(stmt.order_by(Supplier.name.asc())).all()


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    sup_in: SupplierCreate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    supplier = Supplier(
        name=sup_in.name,
        contact_person=sup_in.contact_person,
        phone=sup_in.phone,
        email=sup_in.email,
        address=sup_in.address,
        is_active=True
    )
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/{sup_id}", response_model=SupplierResponse)
def update_supplier(
    sup_id: uuid.UUID,
    sup_in: SupplierUpdate,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    sup = db.scalar(select(Supplier).where(Supplier.id == sup_id))
    if not sup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    if sup_in.name is not None:
        sup.name = sup_in.name
    if sup_in.contact_person is not None:
        sup.contact_person = sup_in.contact_person
    if sup_in.phone is not None:
        sup.phone = sup_in.phone
    if sup_in.email is not None:
        sup.email = sup_in.email
    if sup_in.address is not None:
        sup.address = sup_in.address
    if sup_in.is_active is not None:
        sup.is_active = sup_in.is_active

    db.commit()
    db.refresh(sup)
    return sup


@router.delete("/{sup_id}", response_model=SupplierResponse)
def deactivate_supplier(
    sup_id: uuid.UUID,
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    sup = db.scalar(select(Supplier).where(Supplier.id == sup_id))
    if not sup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    sup.is_active = False
    db.commit()
    db.refresh(sup)
    return sup
