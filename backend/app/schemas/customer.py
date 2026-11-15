import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=180)
    phone: str | None = Field(None, max_length=40)
    address: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=180)
    phone: str | None = Field(None, max_length=40)
    address: str | None = None


class CustomerResponse(BaseModel):
    id: uuid.UUID
    name: str
    phone: str | None
    address: str | None
    pending_credit_amount: Decimal = Decimal("0.00")
    total_sales_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
