import uuid
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, Integer, Numeric, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, text, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class InventoryBatch(Base):
    __tablename__ = "inventory_batches"
    __table_args__ = (
        UniqueConstraint("medicine_id", "batch_number", name="uq_medicine_batch_number"),
        CheckConstraint("purchase_price >= 0", name="chk_batches_purchase_price"),
        CheckConstraint("qty_received > 0", name="chk_batches_qty_received"),
        CheckConstraint("qty_available >= 0 AND qty_available <= qty_received", name="chk_batches_qty_available"),
        CheckConstraint("expiry_date >= purchase_date", name="chk_expiry_after_purchase"),
        {"schema": "public"}
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    medicine_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("public.medicines.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("public.suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    qty_received: Mapped[int] = mapped_column(Integer, nullable=False)
    qty_available: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    medicine = relationship("Medicine", back_populates="batches")
    supplier = relationship("Supplier", back_populates="batches")
    sale_items = relationship("SaleItem", back_populates="batch")
