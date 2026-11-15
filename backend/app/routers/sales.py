import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_cashier
from app.models.sale import Sale
from app.models.user import User
from app.schemas.sale import (
    SaleCreateRequest,
    SaleResponse,
    SaleItemResponse,
    ReceiptDataResponse
)
from app.services.fefo_service import process_sale_fefo

router = APIRouter(prefix="/sales", tags=["Sales & POS Checkout"])


def format_sale_response(sale: Sale) -> SaleResponse:
    return SaleResponse(
        id=sale.id,
        sale_number=sale.sale_number,
        idempotency_key=sale.idempotency_key,
        cashier_id=sale.cashier_id,
        cashier_name=sale.cashier.name if sale.cashier else None,
        customer_id=sale.customer_id,
        customer_name=sale.customer.name if sale.customer else None,
        sale_date=sale.sale_date,
        total_amount=sale.total_amount,
        payment_method=sale.payment_method,
        payment_status=sale.payment_status,
        settled_at=sale.settled_at,
        settled_by=sale.settled_by,
        settled_by_name=sale.settled_by_user.name if sale.settled_by_user else None,
        items=[
            SaleItemResponse(
                id=item.id,
                batch_id=item.batch_id,
                batch_number=item.batch.batch_number if item.batch else None,
                expiry_date=item.batch.expiry_date if item.batch else None,
                medicine_name=item.batch.medicine.name if (item.batch and item.batch.medicine) else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal
            )
            for item in sale.items
        ],
        created_at=sale.created_at
    )


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    sale_in: SaleCreateRequest,
    cashier: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    """
    Atomic Point of Sale checkout.
    Uses FEFO (First Expiring, First Out) batch deduction with row locks.
    """
    sale = process_sale_fefo(db, sale_in, cashier)
    return format_sale_response(sale)


@router.get("", response_model=List[SaleResponse])
def list_sales(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    """
    Paginated sales history.
    Managers view all pharmacy sales. Cashiers only view their own sales.
    """
    stmt = select(Sale).order_by(Sale.sale_date.desc()).limit(limit).offset(offset)
    if current_user.role == "Cashier":
        stmt = stmt.where(Sale.cashier_id == current_user.id)

    sales = db.scalars(stmt).all()
    return [format_sale_response(s) for s in sales]


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale_detail(
    sale_id: uuid.UUID,
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    sale = db.scalar(select(Sale).where(Sale.id == sale_id))
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    # Cashier permission check
    if current_user.role == "Cashier" and sale.cashier_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to other cashiers' sales")

    return format_sale_response(sale)


@router.get("/{sale_id}/receipt", response_model=ReceiptDataResponse)
def get_sale_receipt(
    sale_id: uuid.UUID,
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    """Returns thermal-printable receipt metadata."""
    sale = db.scalar(select(Sale).where(Sale.id == sale_id))
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")

    if current_user.role == "Cashier" and sale.cashier_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return ReceiptDataResponse(
        pharmacy_name="Central Pharmacy & Healthcare",
        sale_id=sale.id,
        sale_number=sale.sale_number,
        sale_date=sale.sale_date,
        cashier_name=sale.cashier.name if sale.cashier else "Cashier",
        customer_name=sale.customer.name if sale.customer else None,
        customer_phone=sale.customer.phone if sale.customer else None,
        payment_method=sale.payment_method,
        payment_status=sale.payment_status,
        total_amount=sale.total_amount,
        items=[
            SaleItemResponse(
                id=item.id,
                batch_id=item.batch_id,
                batch_number=item.batch.batch_number if item.batch else None,
                expiry_date=item.batch.expiry_date if item.batch else None,
                medicine_name=item.batch.medicine.name if (item.batch and item.batch.medicine) else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal
            )
            for item in sale.items
        ],
        settled_at=sale.settled_at
    )
