from datetime import date
from decimal import Decimal
from typing import List
from pydantic import BaseModel


class DashboardManagerResponse(BaseModel):
    today_sales_total: Decimal
    today_paid_total: Decimal
    today_pending_credit_total: Decimal
    today_sales_count: int
    active_medicines_count: int
    sellable_stock_units: int
    low_stock_count: int
    expiring_soon_batch_count: int
    expired_batch_count: int
    pending_credit_total: Decimal


class DashboardCashierResponse(BaseModel):
    my_today_sales_total: Decimal
    my_today_sales_count: int
    my_pending_credit_count: int
    my_pending_credit_amount: Decimal


class DashboardStockResponse(BaseModel):
    total_active_medicines: int
    sellable_stock_units: int
    low_stock_medicines_count: int
    expiring_batches_count: int
    expired_batches_count: int


class SalesReportDailySummary(BaseModel):
    sale_date: str
    total_sales_amount: Decimal
    paid_sales_amount: Decimal
    pending_credit_amount: Decimal
    sales_count: int


class SalesReportResponse(BaseModel):
    start_date: str
    end_date: str
    gross_sales_amount: Decimal
    paid_sales_amount: Decimal
    pending_credit_amount: Decimal
    total_transactions: int
    daily_summaries: List[SalesReportDailySummary]


class InventoryReportItem(BaseModel):
    medicine_name: str
    category_name: str
    selling_price: Decimal
    reorder_level: int
    total_stock_received: int
    sellable_stock: int
    expired_stock: int
    is_low_stock: bool


class InventoryReportResponse(BaseModel):
    total_medicines: int
    total_sellable_units: int
    low_stock_count: int
    items: List[InventoryReportItem]


class CreditReportCustomerSummary(BaseModel):
    customer_id: str
    customer_name: str
    customer_phone: str | None
    pending_sales_count: int
    total_pending_amount: Decimal
    settled_sales_count: int
    total_settled_amount: Decimal


class CreditReportResponse(BaseModel):
    total_outstanding_credit: Decimal
    total_settled_credit: Decimal
    pending_customers_count: int
    customers: List[CreditReportCustomerSummary]
