import uuid
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr, ConfigDict


class SupplierCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=180)
    contact_person: str | None = Field(None, max_length=150)
    phone: str | None = Field(None, max_length=40)
    email: EmailStr | None = None
    address: str | None = None


class SupplierUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=180)
    contact_person: str | None = Field(None, max_length=150)
    phone: str | None = Field(None, max_length=40)
    email: EmailStr | None = None
    address: str | None = None
    is_active: bool | None = None


class SupplierResponse(BaseModel):
    id: uuid.UUID
    name: str
    contact_person: str | None
    phone: str | None
    email: str | None
    address: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
