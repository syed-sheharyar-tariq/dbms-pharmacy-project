from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import List, Tuple
import pytz
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.config import get_settings
from app.models.medicine import Medicine
from app.models.supplier import Supplier
from app.models.batch import InventoryBatch
from app.schemas.batch import BatchPurchaseCreate

settings = get_settings()
pharmacy_tz = pytz.timezone(settings.APP_TIMEZONE)


def record_batch_purchase(
    db: Session,
    purchase_data: BatchPurchaseCreate
) -> InventoryBatch:
    """Records a new inventory batch purchase with full integrity validations."""
    # Verify medicine exists and is active
    medicine = db.scalar(select(Medicine).where(Medicine.id == purchase_data.medicine_id))
    if not medicine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medicine not found"
        )
    if not medicine.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add inventory for an inactive medicine"
        )

    # Verify supplier exists and is active
    supplier = db.scalar(select(Supplier).where(Supplier.id == purchase_data.supplier_id))
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    if not supplier.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add inventory from an inactive supplier"
        )

    # Check batch number uniqueness for this medicine
    existing = db.scalar(
        select(InventoryBatch).where(
            InventoryBatch.medicine_id == purchase_data.medicine_id,
            InventoryBatch.batch_number == purchase_data.batch_number
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Batch number '{purchase_data.batch_number}' already exists for this medicine."
        )

    # Create batch
    new_batch = InventoryBatch(
        medicine_id=purchase_data.medicine_id,
        supplier_id=purchase_data.supplier_id,
        batch_number=purchase_data.batch_number,
        purchase_date=purchase_data.purchase_date,
        expiry_date=purchase_data.expiry_date,
        purchase_price=purchase_data.purchase_price,
        qty_received=purchase_data.qty_received,
        qty_available=purchase_data.qty_received
    )

    db.add(new_batch)
    db.commit()
    db.refresh(new_batch)
    return new_batch


def get_sellable_stock_for_medicine(db: Session, medicine_id) -> int:
    """Calculates total sellable units (unexpired batches with qty_available > 0)."""
    today_local = datetime.now(pharmacy_tz).date()
    stmt = (
        select(func.coalesce(func.sum(InventoryBatch.qty_available), 0))
        .where(
            InventoryBatch.medicine_id == medicine_id,
            InventoryBatch.qty_available > 0,
            InventoryBatch.expiry_date >= today_local
        )
    )
    return int(db.scalar(stmt) or 0)


def get_low_stock_medicines(db: Session) -> List[Tuple[Medicine, int]]:
    """Retrieves all active medicines whose sellable stock is <= reorder_level."""
    today_local = datetime.now(pharmacy_tz).date()
    medicines = db.scalars(select(Medicine).where(Medicine.is_active == True)).all()
    
    low_stock_list = []
    for med in medicines:
        sellable = get_sellable_stock_for_medicine(db, med.id)
        if sellable <= med.reorder_level:
            low_stock_list.append((med, sellable))
    return low_stock_list


def get_expiring_soon_batches(db: Session) -> List[InventoryBatch]:
    """Retrieves batches expiring within 30 days that have remaining stock."""
    today_local = datetime.now(pharmacy_tz).date()
    thirty_days_later = today_local + timedelta(days=30)

    stmt = (
        select(InventoryBatch)
        .where(
            InventoryBatch.qty_available > 0,
            InventoryBatch.expiry_date >= today_local,
            InventoryBatch.expiry_date <= thirty_days_later
        )
        .order_by(InventoryBatch.expiry_date.asc())
    )
    return db.scalars(stmt).all()


def get_expired_batches(db: Session) -> List[InventoryBatch]:
    """Retrieves batches that have expired and still hold remaining stock."""
    today_local = datetime.now(pharmacy_tz).date()

    stmt = (
        select(InventoryBatch)
        .where(
            InventoryBatch.qty_available > 0,
            InventoryBatch.expiry_date < today_local
        )
        .order_by(InventoryBatch.expiry_date.desc())
    )
    return db.scalars(stmt).all()
