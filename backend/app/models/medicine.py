import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, Text, Integer, Numeric, DateTime, ForeignKey, CheckConstraint, text, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Medicine(Base):
    __tablename__ = "medicines"
    __table_args__ = (
        CheckConstraint("selling_price >= 0", name="chk_medicines_selling_price"),
        CheckConstraint("reorder_level >= 0", name="chk_medicines_reorder_level"),
        {"schema": "public"}
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("public.categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    name: Mapped[str] = mapped_column(String(180), nullable=False, index=True)
    generic_name: Mapped[str | None] = mapped_column(String(180), nullable=True, index=True)
    manufacturer: Mapped[str | None] = mapped_column(String(180), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    selling_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reorder_level: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    category = relationship("Category", back_populates="medicines")
    batches = relationship("InventoryBatch", back_populates="medicine")
