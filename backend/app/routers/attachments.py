import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.attachment import Attachment
from app.models.user import User
from app.schemas.attachment import AttachmentResponse

router = APIRouter(prefix="/attachments", tags=["Supabase Storage & Attachments"])
settings = get_settings()


@router.post("/upload", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    entity_type: str = Form(..., description="'medicine', 'batch', 'receipt', or 'customer'"),
    entity_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Uploads a file to Supabase Storage and records metadata.
    Supports medicine photos, supplier invoices, batch analysis sheets, and receipts.
    """
    file_bytes = await file.read()
    file_size = len(file_bytes)
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    storage_path = f"{entity_type}/{entity_id}/{uuid.uuid4().hex}.{file_ext}"

    # Record in database
    attachment = Attachment(
        entity_type=entity_type,
        entity_id=entity_id,
        storage_bucket="pharmacy-attachments",
        storage_path=storage_path,
        file_name=file.filename or "attachment",
        file_type=file.content_type,
        file_size=file_size,
        uploaded_by=current_user.id
    )

    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    # Compute public/signed URL
    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/pharmacy-attachments/{storage_path}"

    return AttachmentResponse(
        id=attachment.id,
        entity_type=attachment.entity_type,
        entity_id=attachment.entity_id,
        storage_bucket=attachment.storage_bucket,
        storage_path=attachment.storage_path,
        file_name=attachment.file_name,
        file_type=attachment.file_type,
        file_size=attachment.file_size,
        public_url=public_url,
        created_at=attachment.created_at
    )


@router.get("/{entity_type}/{entity_id}", response_model=List[AttachmentResponse])
def get_entity_attachments(
    entity_type: str,
    entity_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Lists attachments linked to a specific entity."""
    stmt = (
        select(Attachment)
        .where(
            Attachment.entity_type == entity_type,
            Attachment.entity_id == entity_id
        )
        .order_by(Attachment.created_at.desc())
    )
    attachments = db.scalars(stmt).all()

    return [
        AttachmentResponse(
            id=att.id,
            entity_type=att.entity_type,
            entity_id=att.entity_id,
            storage_bucket=att.storage_bucket,
            storage_path=att.storage_path,
            file_name=att.file_name,
            file_type=att.file_type,
            file_size=att.file_size,
            public_url=f"{settings.SUPABASE_URL}/storage/v1/object/public/{att.storage_bucket}/{att.storage_path}",
            created_at=att.created_at
        )
        for att in attachments
    ]
