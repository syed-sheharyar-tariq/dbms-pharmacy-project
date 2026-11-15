import uuid
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AttachmentResponse(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    storage_bucket: str
    storage_path: str
    file_name: str
    file_type: str | None
    file_size: int | None
    public_url: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
