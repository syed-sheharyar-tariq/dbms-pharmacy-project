import uuid
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, func

from app.database import get_db
from app.dependencies import require_cashier
from app.models.customer import Customer
from app.models.sale import Sale
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.schemas.sale import SaleResponse

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = Query(None, description="Search by name or phone number"),
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    stmt = select(Customer)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(or_(Customer.name.ilike(pattern), Customer.phone.ilike(pattern)))

    customers = db.scalars(stmt.order_by(Customer.name.asc())).all()

    result = []
    for c in customers:
        # Calculate pending credit amount
        pending_amount = db.scalar(
            select(func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")))
            .where(
                Sale.customer_id == c.id,
                Sale.payment_status == "PENDING"
            )
        ) or Decimal("0.00")

        sales_count = db.scalar(
            select(func.count(Sale.id)).where(Sale.customer_id == c.id)
        ) or 0

        result.append(
            CustomerResponse(
                id=c.id,
                name=c.name,
                phone=c.phone,
                address=c.address,
                pending_credit_amount=pending_amount,
                total_sales_count=sales_count,
                created_at=c.created_at,
                updated_at=c.updated_at
            )
        )
    return result


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    cust_in: CustomerCreate,
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    customer = Customer(
        name=cust_in.name,
        phone=cust_in.phone,
        address=cust_in.address
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)

    return CustomerResponse(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        address=customer.address,
        pending_credit_amount=Decimal("0.00"),
        total_sales_count=0,
        created_at=customer.created_at,
        updated_at=customer.updated_at
    )


@router.get("/{cust_id}/sales", response_model=List[SaleResponse])
def get_customer_sales(
    cust_id: uuid.UUID,
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    customer = db.scalar(select(Customer).where(Customer.id == cust_id))
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    sales = db.scalars(
        select(Sale).where(Sale.customer_id == cust_id).order_by(Sale.sale_date.desc())
    ).all()

    return sales
