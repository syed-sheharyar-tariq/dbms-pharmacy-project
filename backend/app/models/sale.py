import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Numeric, DateTime, ForeignKey, CheckConstraint, text, func, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("total_amount > 0", name="chk_sales_total_amount"),
        CheckConstraint("payment_method IN ('CASH', 'CREDIT')", name="chk_sales_payment_method"),
        CheckConstraint("payment_status IN ('PAID', 'PENDING')", name="chk_sales_payment_status"),
        CheckConstraint(
            "payment_method <> 'CASH' OR (payment_status = 'PAID' AND settled_at IS NULL AND settled_by IS NULL)",
            name="chk_sales_cash_paid"
        ),
        CheckConstraint(
            "payment_method <> 'CREDIT' OR customer_id IS NOT NULL",
            name="chk_sales_credit_customer"
        ),
        CheckConstraint(
            "payment_method <> 'CREDIT' OR ("
            "(payment_status = 'PENDING' AND settled_at IS NULL AND settled_by IS NULL) OR "
            "(payment_status = 'PAID' AND settled_at IS NOT NULL AND settled_by IS NOT NULL)"
            ")",
            name="chk_sales_credit_settlement"
        ),
        {"schema": "public"}
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()")
    )
    sale_number: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True, index=True)
    cashier_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("public.users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("public.customers.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )
    sale_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(10), nullable=False)
    payment_status: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    settled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    settled_by: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("public.users.id", ondelete="RESTRICT"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    # Relationships
    cashier = relationship("User", foreign_keys=[cashier_id], back_populates="sales_created")
    settled_by_user = relationship("User", foreign_keys=[settled_by], back_populates="sales_settled")
    customer = relationship("Customer", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
