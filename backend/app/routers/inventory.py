import uuid
from typing import List, Optional
from datetime import datetime
import pytz
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_stock, require_any_active_role
from app.models.batch import InventoryBatch
from app.models.medicine import Medicine
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.batch import BatchPurchaseCreate, BatchResponse
from app.schemas.medicine import MedicineResponse
from app.services.inventory_service import (
    record_batch_purchase,
    get_sellable_stock_for_medicine
)

router = APIRouter(prefix="/inventory", tags=["Inventory & Batches"])
settings = get_settings()
pharmacy_tz = pytz.timezone(settings.APP_TIMEZONE)


@router.post("/purchase", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def purchase_batch(
    purchase_in: BatchPurchaseCreate,
    current_user: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    """Stock Handler / Manager: Record new batch purchase."""
    batch = record_batch_purchase(db, purchase_in)
    today_local = datetime.now(pharmacy_tz).date()

    return BatchResponse(
        id=batch.id,
        medicine_id=batch.medicine_id,
        medicine_name=batch.medicine.name if batch.medicine else None,
        supplier_id=batch.supplier_id,
        supplier_name=batch.supplier.name if batch.supplier else None,
        batch_number=batch.batch_number,
        purchase_date=batch.purchase_date,
        expiry_date=batch.expiry_date,
        purchase_price=batch.purchase_price,
        qty_received=batch.qty_received,
        qty_available=batch.qty_available,
        is_expired=(batch.expiry_date < today_local),
        is_expiring_soon=(today_local <= batch.expiry_date <= today_local.replace(day=today_local.day)),
        created_at=batch.created_at
    )


@router.get("/batches", response_model=List[BatchResponse])
def list_batches(
    medicine_id: Optional[uuid.UUID] = Query(None),
    supplier_id: Optional[uuid.UUID] = Query(None),
    current_user: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    stmt = select(InventoryBatch)
    if medicine_id:
        stmt = stmt.where(InventoryBatch.medicine_id == medicine_id)
    if supplier_id:
        stmt = stmt.where(InventoryBatch.supplier_id == supplier_id)

    batches = db.scalars(stmt.order_by(InventoryBatch.expiry_date.asc())).all()
    today_local = datetime.now(pharmacy_tz).date()

    result = []
    for b in batches:
        result.append(
            BatchResponse(
                id=b.id,
                medicine_id=b.medicine_id,
                medicine_name=b.medicine.name if b.medicine else None,
                supplier_id=b.supplier_id,
                supplier_name=b.supplier.name if b.supplier else None,
                batch_number=b.batch_number,
                purchase_date=b.purchase_date,
                expiry_date=b.expiry_date,
                purchase_price=b.purchase_price,
                qty_received=b.qty_received,
                qty_available=b.qty_available,
                is_expired=(b.expiry_date < today_local),
                is_expiring_soon=(today_local <= b.expiry_date <= today_local.replace(day=today_local.day)),
                created_at=b.created_at
            )
        )
    return result


@router.get("/stock", response_model=List[MedicineResponse])
def get_aggregated_stock(
    current_user: User = Depends(require_any_active_role),
    db: Session = Depends(get_db)
):
    """Aggregated stock list with sellable (unexpired) quantity."""
    medicines = db.scalars(select(Medicine).where(Medicine.is_active == True).order_by(Medicine.name.asc())).all()
    result = []
    for med in medicines:
        sellable = get_sellable_stock_for_medicine(db, med.id)
        result.append(
            MedicineResponse(
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
        )
    return result


@router.get("/history", response_model=List[BatchResponse])
def get_inventory_history(
    current_user: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    """Complete batch purchase history."""
    batches = db.scalars(select(InventoryBatch).order_by(InventoryBatch.created_at.desc())).all()
    today_local = datetime.now(pharmacy_tz).date()

    return [
        BatchResponse(
            id=b.id,
            medicine_id=b.medicine_id,
            medicine_name=b.medicine.name if b.medicine else None,
            supplier_id=b.supplier_id,
            supplier_name=b.supplier.name if b.supplier else None,
            batch_number=b.batch_number,
            purchase_date=b.purchase_date,
            expiry_date=b.expiry_date,
            purchase_price=b.purchase_price,
            qty_received=b.qty_received,
            qty_available=b.qty_available,
            is_expired=(b.expiry_date < today_local),
            is_expiring_soon=False,
            created_at=b.created_at
        )
        for b in batches
    ]
