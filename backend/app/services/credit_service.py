import uuid
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.sale import Sale
from app.models.user import User


def settle_credit_sale(
    db: Session,
    sale_id: uuid.UUID,
    settler: User
) -> Sale:
    """
    Settles an outstanding credit sale in full.
    - Atomically updates payment_status to 'PAID'.
    - Records settled_at timestamp and settled_by user ID.
    - Prevents partial payment and rejects duplicate settlements.
    - Enforces role-based settlement scope.
    """
    sale = db.scalar(select(Sale).where(Sale.id == sale_id))
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Credit sale record not found"
        )

    if sale.payment_method != "CREDIT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale was not made on credit and cannot be settled"
        )

    if sale.payment_status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Credit sale {sale.sale_number} is already settled and fully paid"
        )

    # CR-04 Scope Enforcement: Cashier can only settle sales they originated unless Manager
    if settler.role == "Cashier" and sale.cashier_id != settler.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cashiers may only settle credit sales originated from their own shift/register"
        )

    # Settle in full atomically
    sale.payment_status = "PAID"
    sale.settled_at = datetime.now(timezone.utc)
    sale.settled_by = settler.id

    db.commit()
    db.refresh(sale)
    return sale
