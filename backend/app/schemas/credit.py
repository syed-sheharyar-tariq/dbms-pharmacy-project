import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class CreditPendingResponse(BaseModel):
    sale_id: uuid.UUID
    sale_number: str
    sale_date: datetime
    customer_id: uuid.UUID
    customer_name: str
    customer_phone: str | None = None
    cashier_name: str
    total_amount: Decimal
    created_at: datetime


class CreditSettleResponse(BaseModel):
    sale_id: uuid.UUID
    sale_number: str
    payment_status: str
    settled_at: datetime
    settled_by: uuid.UUID
    settled_by_name: str
    message: str
