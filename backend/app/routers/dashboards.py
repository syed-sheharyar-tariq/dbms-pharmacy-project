from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_manager, require_cashier, require_stock
from app.models.user import User
from app.schemas.report import (
    DashboardManagerResponse,
    DashboardCashierResponse,
    DashboardStockResponse
)
from app.services.reporting_service import (
    get_manager_dashboard_metrics,
    get_cashier_dashboard_metrics,
    get_stock_dashboard_metrics
)

router = APIRouter(prefix="/dashboard", tags=["Role Dashboards"])


@router.get("/manager", response_model=DashboardManagerResponse)
def get_manager_dashboard(
    manager: User = Depends(require_manager),
    db: Session = Depends(get_db)
):
    """Manager overview: today's sales, active catalog, stock units, alerts, pending credit."""
    return get_manager_dashboard_metrics(db)


@router.get("/cashier", response_model=DashboardCashierResponse)
def get_cashier_dashboard(
    cashier: User = Depends(require_cashier),
    db: Session = Depends(get_db)
):
    """Cashier overview: shift sales, pending credit sales originated."""
    return get_cashier_dashboard_metrics(db, cashier)


@router.get("/stock", response_model=DashboardStockResponse)
def get_stock_dashboard(
    stock_handler: User = Depends(require_stock),
    db: Session = Depends(get_db)
):
    """Stock Handler overview: catalog units, low stock alerts, expiring batches."""
    return get_stock_dashboard_metrics(db)
