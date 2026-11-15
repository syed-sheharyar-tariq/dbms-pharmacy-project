import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict


class MedicineCreate(BaseModel):
    category_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=180)
    generic_name: str | None = Field(None, max_length=180)
    manufacturer: str | None = Field(None, max_length=180)
    description: str | None = None
    selling_price: Decimal = Field(..., ge=0)
    reorder_level: int = Field(0, ge=0)


class MedicineUpdate(BaseModel):
    category_id: uuid.UUID | None = None
    name: str | None = Field(None, min_length=2, max_length=180)
    generic_name: str | None = Field(None, max_length=180)
    manufacturer: str | None = Field(None, max_length=180)
    description: str | None = None
    selling_price: Decimal | None = Field(None, ge=0)
    reorder_level: int | None = Field(None, ge=0)
    is_active: bool | None = None


class MedicineResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    category_name: str | None = None
    name: str
    generic_name: str | None
    manufacturer: str | None
    description: str | None
    selling_price: Decimal
    reorder_level: int
    is_active: bool
    sellable_quantity: int = 0
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
