from datetime import date, timedelta, datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import pytz

from app.config import get_settings
from app.database import get_db
from app.dependencies import require_manager, require_stock, require_cashier
from app.models.user import User
from app.schemas.report import (
    SalesReportResponse,
    InventoryReportResponse,
    CreditReportResponse
)
from app.services.reporting_service import (
    generate_sales_report,
    generate_inventory_report,
    generate_credit_report
)

router = APIRouter(prefix="/reports", tags=["Analytics & Reports"])
settings = get_settings()
pharmacy_tz = pytz.timezone(settings.APP_TIMEZONE)


@router.get("/sales", response_model=SalesReportResponse)
def get_sales_report(
    start_date: date = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(default=None, description="End date (YYYY-MM-DD)"),
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """Manager-only sales performance report with daily breakdown."""
    today = datetime.now(pharmacy_tz).date()
    if end_date is None:
        end_date = today
    if start_date is None:
        start_date = today - timedelta(days=30)

    return generate_sales_report(db, start_date, end_date)


@router.get("/inventory", response_model=InventoryReportResponse)
def get_inventory_report(
    current_user: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    """Stock / Manager inventory audit report."""
    return generate_inventory_report(db)


@router.get("/credit", response_model=CreditReportResponse)
def get_credit_report(
    current_user: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    """Customer credit balance overview."""
    return generate_credit_report(db)
