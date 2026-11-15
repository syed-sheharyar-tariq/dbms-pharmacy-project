import uuid
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator, ConfigDict


class BatchPurchaseCreate(BaseModel):
    medicine_id: uuid.UUID
    supplier_id: uuid.UUID
    batch_number: str = Field(..., min_length=1, max_length=100)
    purchase_date: date
    expiry_date: date
    purchase_price: Decimal = Field(..., ge=0)
    qty_received: int = Field(..., gt=0)

    @model_validator(mode="after")
    def validate_expiry(self):
        if self.expiry_date < self.purchase_date:
            raise ValueError("Expiry date cannot be earlier than purchase date")
        return self


class BatchResponse(BaseModel):
    id: uuid.UUID
    medicine_id: uuid.UUID
    medicine_name: str | None = None
    supplier_id: uuid.UUID
    supplier_name: str | None = None
    batch_number: str
    purchase_date: date
    expiry_date: date
    purchase_price: Decimal
    qty_received: int
    qty_available: int
    is_expired: bool = False
    is_expiring_soon: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
