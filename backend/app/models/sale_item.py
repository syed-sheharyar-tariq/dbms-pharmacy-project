import uuid
from decimal import Decimal
from sqlalchemy import Integer, Numeric, ForeignKey, CheckConstraint, text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_sale_items_quantity"),
        CheckConstraint("unit_price >= 0", name="chk_sale_items_unit_price"),
        CheckConstraint("subtotal >= 0", name="chk_sale_items_subtotal"),
        {"schema": "public"}
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    sale_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("public.sales.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    batch_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("public.inventory_batches.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Relationships
    sale = relationship("Sale", back_populates="items")
    batch = relationship("InventoryBatch", back_populates="sale_items")
