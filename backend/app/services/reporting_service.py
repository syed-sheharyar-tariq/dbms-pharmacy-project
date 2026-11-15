from datetime import datetime, time, date, timedelta
from decimal import Decimal
import pytz
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from app.config import get_settings
from app.models.sale import Sale
from app.models.medicine import Medicine
from app.models.batch import InventoryBatch
from app.models.customer import Customer
from app.models.user import User
from app.schemas.report import (
    DashboardManagerResponse,
    DashboardCashierResponse,
    DashboardStockResponse,
    SalesReportResponse,
    SalesReportDailySummary,
    InventoryReportResponse,
    InventoryReportItem,
    CreditReportResponse,
    CreditReportCustomerSummary
)

settings = get_settings()
pharmacy_tz = pytz.timezone(settings.APP_TIMEZONE)


def get_local_day_utc_bounds(target_date: date | None = None) -> tuple[datetime, datetime]:
    """Returns the UTC start and end datetimes for a given Asia/Karachi calendar day."""
    if target_date is None:
        target_date = datetime.now(pharmacy_tz).date()

    start_local = pharmacy_tz.localize(datetime.combine(target_date, time.min))
    end_local = pharmacy_tz.localize(datetime.combine(target_date, time.max))

    start_utc = start_local.astimezone(pytz.UTC)
    end_utc = end_local.astimezone(pytz.UTC)
    return start_utc, end_utc


def get_manager_dashboard_metrics(db: Session) -> DashboardManagerResponse:
    start_utc, end_utc = get_local_day_utc_bounds()
    today_local = datetime.now(pharmacy_tz).date()
    thirty_days = today_local + timedelta(days=30)

    # 1. Today's sales
    today_sales = db.scalars(
        select(Sale).where(Sale.sale_date >= start_utc, Sale.sale_date <= end_utc)
    ).all()

    today_sales_total = sum((s.total_amount for s in today_sales), Decimal("0.00"))
    today_paid_total = sum((s.total_amount for s in today_sales if s.payment_status == "PAID"), Decimal("0.00"))
    today_pending_credit_total = sum((s.total_amount for s in today_sales if s.payment_status == "PENDING"), Decimal("0.00"))
    today_sales_count = len(today_sales)

    # 2. Active medicines
    active_meds = db.scalars(select(Medicine).where(Medicine.is_active == True)).all()
    active_medicines_count = len(active_meds)

    # 3. Sellable stock units & Low stock count
    sellable_stock_units = 0
    low_stock_count = 0
    for med in active_meds:
        unexpired_stock = db.scalar(
            select(func.coalesce(func.sum(InventoryBatch.qty_available), 0))
            .where(
                InventoryBatch.medicine_id == med.id,
                InventoryBatch.qty_available > 0,
                InventoryBatch.expiry_date >= today_local
            )
        ) or 0
        sellable_stock_units += unexpired_stock
        if unexpired_stock <= med.reorder_level:
            low_stock_count += 1

    # 4. Expiring and Expired batches
    expiring_soon_count = db.scalar(
        select(func.count(InventoryBatch.id))
        .where(
            InventoryBatch.qty_available > 0,
            InventoryBatch.expiry_date >= today_local,
            InventoryBatch.expiry_date <= thirty_days
        )
    ) or 0

    expired_count = db.scalar(
        select(func.count(InventoryBatch.id))
        .where(
            InventoryBatch.qty_available > 0,
            InventoryBatch.expiry_date < today_local
        )
    ) or 0

    # 5. Total pending credit amount
    pending_credit_total = db.scalar(
        select(func.coalesce(func.sum(Sale.total_amount), Decimal("0.00")))
        .where(Sale.payment_status == "PENDING")
    ) or Decimal("0.00")

    return DashboardManagerResponse(
        today_sales_total=today_sales_total,
        today_paid_total=today_paid_total,
        today_pending_credit_total=today_pending_credit_total,
        today_sales_count=today_sales_count,
        active_medicines_count=active_medicines_count,
        sellable_stock_units=sellable_stock_units,
        low_stock_count=low_stock_count,
        expiring_soon_batch_count=expiring_soon_count,
        expired_batch_count=expired_count,
        pending_credit_total=pending_credit_total
    )


def get_cashier_dashboard_metrics(db: Session, cashier: User) -> DashboardCashierResponse:
    start_utc, end_utc = get_local_day_utc_bounds()

    # Cashier today's sales
    my_today_sales = db.scalars(
        select(Sale).where(
            Sale.cashier_id == cashier.id,
            Sale.sale_date >= start_utc,
            Sale.sale_date <= end_utc
        )
    ).all()

    my_today_sales_total = sum((s.total_amount for s in my_today_sales), Decimal("0.00"))
    my_today_sales_count = len(my_today_sales)

    # Cashier pending credit sales
    my_pending_sales = db.scalars(
        select(Sale).where(
            Sale.cashier_id == cashier.id,
            Sale.payment_status == "PENDING"
        )
    ).all()

    return DashboardCashierResponse(
        my_today_sales_total=my_today_sales_total,
        my_today_sales_count=my_today_sales_count,
        my_pending_credit_count=len(my_pending_sales),
        my_pending_credit_amount=sum((s.total_amount for s in my_pending_sales), Decimal("0.00"))
    )


def get_stock_dashboard_metrics(db: Session) -> DashboardStockResponse:
    today_local = datetime.now(pharmacy_tz).date()
    thirty_days = today_local + timedelta(days=30)

    active_meds = db.scalars(select(Medicine).where(Medicine.is_active == True)).all()
    sellable_stock_units = 0
    low_stock_count = 0

    for med in active_meds:
        unexpired_stock = db.scalar(
            select(func.coalesce(func.sum(InventoryBatch.qty_available), 0))
            .where(
                InventoryBatch.medicine_id == med.id,
                InventoryBatch.qty_available > 0,
                InventoryBatch.expiry_date >= today_local
            )
        ) or 0
        sellable_stock_units += unexpired_stock
        if unexpired_stock <= med.reorder_level:
            low_stock_count += 1

    expiring_count = db.scalar(
        select(func.count(InventoryBatch.id))
        .where(
            InventoryBatch.qty_available > 0,
            InventoryBatch.expiry_date >= today_local,
            InventoryBatch.expiry_date <= thirty_days
        )
    ) or 0

    expired_count = db.scalar(
        select(func.count(InventoryBatch.id))
        .where(
            InventoryBatch.qty_available > 0,
            InventoryBatch.expiry_date < today_local
        )
    ) or 0

    return DashboardStockResponse(
        total_active_medicines=len(active_meds),
        sellable_stock_units=sellable_stock_units,
        low_stock_medicines_count=low_stock_count,
        expiring_batches_count=expiring_count,
        expired_batches_count=expired_count
    )


def generate_sales_report(
    db: Session,
    start_date: date,
    end_date: date
) -> SalesReportResponse:
    start_utc, _ = get_local_day_utc_bounds(start_date)
    _, end_utc = get_local_day_utc_bounds(end_date)

    sales = db.scalars(
        select(Sale)
        .where(Sale.sale_date >= start_utc, Sale.sale_date <= end_utc)
        .order_by(Sale.sale_date.asc())
    ).all()

    gross = Decimal("0.00")
    paid = Decimal("0.00")
    pending = Decimal("0.00")

    daily_map = {}

    for s in sales:
        gross += s.total_amount
        if s.payment_status == "PAID":
            paid += s.total_amount
        else:
            pending += s.total_amount

        # Local date representation
        local_date_str = s.sale_date.astimezone(pharmacy_tz).strftime("%Y-%m-%d")
        if local_date_str not in daily_map:
            daily_map[local_date_str] = {
                "sale_date": local_date_str,
                "total_sales_amount": Decimal("0.00"),
                "paid_sales_amount": Decimal("0.00"),
                "pending_credit_amount": Decimal("0.00"),
                "sales_count": 0
            }
        daily_map[local_date_str]["total_sales_amount"] += s.total_amount
        if s.payment_status == "PAID":
            daily_map[local_date_str]["paid_sales_amount"] += s.total_amount
        else:
            daily_map[local_date_str]["pending_credit_amount"] += s.total_amount
        daily_map[local_date_str]["sales_count"] += 1

    daily_summaries = [SalesReportDailySummary(**val) for val in sorted(daily_map.values(), key=lambda x: x["sale_date"])]

    return SalesReportResponse(
        start_date=str(start_date),
        end_date=str(end_date),
        gross_sales_amount=gross,
        paid_sales_amount=paid,
        pending_credit_amount=pending,
        total_transactions=len(sales),
        daily_summaries=daily_summaries
    )


def generate_inventory_report(db: Session) -> InventoryReportResponse:
    today_local = datetime.now(pharmacy_tz).date()
    medicines = db.scalars(select(Medicine).order_by(Medicine.name.asc())).all()

    items = []
    total_sellable = 0
    low_stock_count = 0

    for med in medicines:
        batches = db.scalars(select(InventoryBatch).where(InventoryBatch.medicine_id == med.id)).all()
        received = sum(b.qty_received for b in batches)
        sellable = sum(b.qty_available for b in batches if b.expiry_date >= today_local)
        expired = sum(b.qty_available for b in batches if b.expiry_date < today_local)
        is_low = sellable <= med.reorder_level

        if is_low and med.is_active:
            low_stock_count += 1
        total_sellable += sellable

        items.append(
            InventoryReportItem(
                medicine_name=med.name,
                category_name=med.category.name if med.category else "Unassigned",
                selling_price=med.selling_price,
                reorder_level=med.reorder_level,
                total_stock_received=received,
                sellable_stock=sellable,
                expired_stock=expired,
                is_low_stock=is_low
            )
        )

    return InventoryReportResponse(
        total_medicines=len(medicines),
        total_sellable_units=total_sellable,
        low_stock_count=low_stock_count,
        items=items
    )


def generate_credit_report(db: Session) -> CreditReportResponse:
    customers = db.scalars(select(Customer).order_by(Customer.name.asc())).all()

    customer_summaries = []
    total_outstanding = Decimal("0.00")
    total_settled = Decimal("0.00")
    pending_customers_count = 0

    for cust in customers:
        credit_sales = db.scalars(
            select(Sale).where(Sale.customer_id == cust.id, Sale.payment_method == "CREDIT")
        ).all()

        pending_sales = [s for s in credit_sales if s.payment_status == "PENDING"]
        settled_sales = [s for s in credit_sales if s.payment_status == "PAID"]

        cust_pending = sum((s.total_amount for s in pending_sales), Decimal("0.00"))
        cust_settled = sum((s.total_amount for s in settled_sales), Decimal("0.00"))

        if len(pending_sales) > 0:
            pending_customers_count += 1
        total_outstanding += cust_pending
        total_settled += cust_settled

        customer_summaries.append(
            CreditReportCustomerSummary(
                customer_id=str(cust.id),
                customer_name=cust.name,
                customer_phone=cust.phone,
                pending_sales_count=len(pending_sales),
                total_pending_amount=cust_pending,
                settled_sales_count=len(settled_sales),
                total_settled_amount=cust_settled
            )
        )

    return CreditReportResponse(
        total_outstanding_credit=total_outstanding,
        total_settled_credit=total_settled,
        pending_customers_count=pending_customers_count,
        customers=customer_summaries
    )
