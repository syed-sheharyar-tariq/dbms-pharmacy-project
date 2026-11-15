import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Literal
from pydantic import BaseModel, Field, model_validator, ConfigDict


class SaleItemRequest(BaseModel):
    medicine_id: uuid.UUID
    quantity: int = Field(..., gt=0)


class SaleCreateRequest(BaseModel):
    payment_method: Literal["CASH", "CREDIT"]
    customer_id: uuid.UUID | None = None
    items: List[SaleItemRequest] = Field(..., min_length=1)
    idempotency_key: str | None = Field(None, max_length=64)

    @model_validator(mode="after")
    def validate_payment_requirements(self):
        if self.payment_method == "CREDIT" and not self.customer_id:
            raise ValueError("Customer selection is required for CREDIT sales")
        return self


class SaleItemResponse(BaseModel):
    id: uuid.UUID
    batch_id: uuid.UUID
    batch_number: str | None = None
    expiry_date: date | None = None
    medicine_name: str | None = None
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class SaleResponse(BaseModel):
    id: uuid.UUID
    sale_number: str
    idempotency_key: str | None = None
    cashier_id: uuid.UUID
    cashier_name: str | None = None
    customer_id: uuid.UUID | None = None
    customer_name: str | None = None
    sale_date: datetime
    total_amount: Decimal
    payment_method: str
    payment_status: str
    settled_at: datetime | None = None
    settled_by: uuid.UUID | None = None
    settled_by_name: str | None = None
    items: List[SaleItemResponse] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReceiptDataResponse(BaseModel):
    pharmacy_name: str = "Central Pharmacy & Healthcare"
    sale_id: uuid.UUID
    sale_number: str
    sale_date: datetime
    cashier_name: str
    customer_name: str | None = None
    customer_phone: str | None = None
    payment_method: str
    payment_status: str
    total_amount: Decimal
    items: List[SaleItemResponse]
    settled_at: datetime | None = None
