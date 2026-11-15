import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserProfileSync(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    contact: str | None = Field(None, max_length=40)
    # Role cannot be self-assigned; defaults to Cashier or assigned by Manager


class UserCreate(BaseModel):
    auth_id: uuid.UUID
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    contact: str | None = Field(None, max_length=40)
    role: str = Field(..., pattern="^(Manager|Cashier|Stock Handler)$")


class UserUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=150)
    contact: str | None = Field(None, max_length=40)
    role: str | None = Field(None, pattern="^(Manager|Cashier|Stock Handler)$")
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: uuid.UUID
    auth_id: uuid.UUID
    name: str
    email: str
    contact: str | None
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
