import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.database import get_db
from app.dependencies import require_cashier
from app.models.sale import Sale
from app.models.user import User
from app.schemas.credit import CreditPendingResponse, CreditSettleResponse
from app.services.credit_service import settle_credit_sale

router = APIRouter(prefix="/credit", tags=["Credit Management & Settlement"])


@router.get("/pending", response_model=List[CreditPendingResponse])
def list_pending_credit(
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    """Lists all outstanding CREDIT sales awaiting settlement."""
    stmt = (
        select(Sale)
        .where(
            Sale.payment_method == "CREDIT",
            Sale.payment_status == "PENDING"
        )
        .order_by(Sale.sale_date.asc())
    )
    sales = db.scalars(stmt).all()

    result = []
    for s in sales:
        result.append(
            CreditPendingResponse(
                sale_id=s.id,
                sale_number=s.sale_number,
                sale_date=s.sale_date,
                customer_id=s.customer_id,
                customer_name=s.customer.name if s.customer else "Unknown Customer",
                customer_phone=s.customer.phone if s.customer else None,
                cashier_name=s.cashier.name if s.cashier else "Staff",
                total_amount=s.total_amount,
                created_at=s.created_at
            )
        )
    return result


@router.post("/{sale_id}/settle", response_model=CreditSettleResponse)
def settle_credit(
    sale_id: uuid.UUID,
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    """
    Settle outstanding credit in full.
    Enforces role-based permissions and records audit trail.
    """
    sale = settle_credit_sale(db, sale_id, current_user)

    return CreditSettleResponse(
        sale_id=sale.id,
        sale_number=sale.sale_number,
        payment_status=sale.payment_status,
        settled_at=sale.settled_at,
        settled_by=sale.settled_by,
        settled_by_name=current_user.name,
        message=f"Credit sale {sale.sale_number} has been settled in full."
    )
