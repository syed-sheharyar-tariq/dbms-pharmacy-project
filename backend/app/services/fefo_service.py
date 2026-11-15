import uuid
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Tuple
import pytz
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.config import get_settings
from app.models.medicine import Medicine
from app.models.batch import InventoryBatch
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.user import User
from app.schemas.sale import SaleCreateRequest

settings = get_settings()
pharmacy_tz = pytz.timezone(settings.APP_TIMEZONE)


def round_money(amount: Decimal) -> Decimal:
    """Consistently rounds to 2 decimal places using ROUND_HALF_UP."""
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def process_sale_fefo(
    db: Session,
    sale_data: SaleCreateRequest,
    cashier: User
) -> Sale:
    """
    Executes an atomic checkout using First Expiring, First Out (FEFO) inventory allocation.
    - Locks batch rows using SELECT ... FOR UPDATE.
    - Validates unexpired sellable stock.
    - All-or-nothing multi-item transaction.
    - Handles idempotency key to prevent double checkout.
    """
    # 1. Idempotency Check
    if sale_data.idempotency_key:
        existing_sale = db.scalar(
            select(Sale).where(Sale.idempotency_key == sale_data.idempotency_key)
        )
        if existing_sale:
            return existing_sale

    now_local = datetime.now(pharmacy_tz)
    today_local_date = now_local.date()

    # Sort requested items deterministically by medicine_id to prevent database deadlocks
    sorted_items = sorted(sale_data.items, key=lambda x: str(x.medicine_id))

    sale_items_to_create: List[SaleItem] = []
    total_sale_amount = Decimal("0.00")

    # 2. Iterate each requested medicine and lock eligible batches
    for item in sorted_items:
        # Validate medicine exists and is active
        medicine = db.scalar(
            select(Medicine).where(Medicine.id == item.medicine_id)
        )
        if not medicine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medicine ID {item.medicine_id} not found"
            )
        if not medicine.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Medicine '{medicine.name}' is inactive and cannot be sold"
            )

        unit_price = medicine.selling_price
        needed_qty = item.quantity

        # Query eligible unexpired batches with FOR UPDATE lock
        # Ordering: expiry_date ASC, then purchase_date ASC, created_at ASC, id ASC
        batches_stmt = (
            select(InventoryBatch)
            .where(
                InventoryBatch.medicine_id == medicine.id,
                InventoryBatch.qty_available > 0,
                InventoryBatch.expiry_date >= today_local_date
            )
            .order_by(
                InventoryBatch.expiry_date.asc(),
                InventoryBatch.purchase_date.asc(),
                InventoryBatch.created_at.asc(),
                InventoryBatch.id.asc()
            )
        )
        if db.bind and db.bind.dialect.name == "postgresql":
            batches_stmt = batches_stmt.with_for_update()
        eligible_batches: List[InventoryBatch] = db.scalars(batches_stmt).all()

        total_available = sum(b.qty_available for b in eligible_batches)
        if total_available < needed_qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient sellable stock for '{medicine.name}'. "
                    f"Requested: {needed_qty}, Available (Unexpired): {total_available}"
                )
            )

        # Allocate across batches according to FEFO
        remaining_to_allocate = needed_qty
        for batch in eligible_batches:
            if remaining_to_allocate == 0:
                break

            deduct_qty = min(batch.qty_available, remaining_to_allocate)
            batch.qty_available -= deduct_qty
            remaining_to_allocate -= deduct_qty

            line_subtotal = round_money(Decimal(deduct_qty) * unit_price)
            total_sale_amount += line_subtotal

            # Prepare sale item
            sale_item = SaleItem(
                batch_id=batch.id,
                quantity=deduct_qty,
                unit_price=unit_price,
                subtotal=line_subtotal
            )
            sale_items_to_create.append(sale_item)

    # 3. Generate Sale Number (e.g. SALE-20261115-XXXX)
    date_prefix = now_local.strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:6].upper()
    sale_number = f"SALE-{date_prefix}-{unique_suffix}"

    # 4. Determine Payment Status
    payment_status = "PAID" if sale_data.payment_method == "CASH" else "PENDING"

    # 5. Create Sale Record
    new_sale = Sale(
        sale_number=sale_number,
        idempotency_key=sale_data.idempotency_key,
        cashier_id=cashier.id,
        customer_id=sale_data.customer_id,
        sale_date=datetime.now(timezone.utc),
        total_amount=round_money(total_sale_amount),
        payment_method=sale_data.payment_method,
        payment_status=payment_status,
        settled_at=None,
        settled_by=None
    )

    db.add(new_sale)
    db.flush()  # Populates new_sale.id

    # Attach sale_id to sale items and add to session
    for sale_item in sale_items_to_create:
        sale_item.sale_id = new_sale.id
        db.add(sale_item)

    # Atomic commit
    db.commit()
    db.refresh(new_sale)

    return new_sale
