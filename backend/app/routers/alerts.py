from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_stock
from app.models.user import User
from app.schemas.medicine import MedicineResponse
from app.schemas.batch import BatchResponse
from app.services.inventory_service import (
    get_low_stock_medicines,
    get_expiring_soon_batches,
    get_expired_batches
)

router = APIRouter(prefix="/alerts", tags=["Inventory Alerts"])


@router.get("/low-stock", response_model=List[MedicineResponse])
def get_low_stock_alerts(
    current_user: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    """Medicines where unexpired sellable stock <= reorder_level."""
    low_stock_pairs = get_low_stock_medicines(db)
    result = []
    for med, sellable in low_stock_pairs:
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
                is_low_stock=True,
                created_at=med.created_at,
                updated_at=med.updated_at
            )
        )
    return result


@router.get("/expiring", response_model=List[BatchResponse])
def get_expiring_soon_alerts(
    current_user: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    """Batches with remaining stock expiring within the next 30 days."""
    batches = get_expiring_soon_batches(db)
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
            is_expired=False,
            is_expiring_soon=True,
            created_at=b.created_at
        )
        for b in batches
    ]


@router.get("/expired", response_model=List[BatchResponse])
def get_expired_stock_alerts(
    current_user: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    """Batches that have expired and still contain stock units."""
    batches = get_expired_batches(db)
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
            is_expired=True,
            is_expiring_soon=False,
            created_at=b.created_at
        )
        for b in batches
    ]
