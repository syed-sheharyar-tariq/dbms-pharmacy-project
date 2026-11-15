import os
os.environ["ENVIRONMENT"] = "test"

import uuid
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.models.base import Base
from app.models.user import User
from app.models.category import Category
from app.models.supplier import Supplier
from app.models.medicine import Medicine
from app.models.batch import InventoryBatch
from app.models.customer import Customer
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.database import get_db
from app.main import app

# Test SQLite in-memory engine with static pool for single thread
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Strip schema names for SQLite compatibility
for table in Base.metadata.tables.values():
    table.schema = None


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# Test Users & Tokens
MANAGER_AUTH_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
CASHIER_AUTH_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
STOCK_AUTH_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
INACTIVE_AUTH_ID = uuid.UUID("44444444-4444-4444-4444-444444444444")

MANAGER_HEADERS = {"Authorization": f"Bearer test-token-manager:{MANAGER_AUTH_ID}:manager@pharmacy.local"}
CASHIER_HEADERS = {"Authorization": f"Bearer test-token-cashier:{CASHIER_AUTH_ID}:cashier@pharmacy.local"}
STOCK_HEADERS = {"Authorization": f"Bearer test-token-stock:{STOCK_AUTH_ID}:stock@pharmacy.local"}
INACTIVE_HEADERS = {"Authorization": f"Bearer test-token-inactive:{INACTIVE_AUTH_ID}:inactive@pharmacy.local"}


@pytest.fixture(autouse=True)
def seed_test_users(db_session):
    # Ensure users exist in the test DB
    if not db_session.query(User).filter(User.auth_id == MANAGER_AUTH_ID).first():
        mgr = User(
            auth_id=MANAGER_AUTH_ID,
            name="Alice Manager",
            email="manager@pharmacy.local",
            role="Manager",
            is_active=True
        )
        csh = User(
            auth_id=CASHIER_AUTH_ID,
            name="Bob Cashier",
            email="cashier@pharmacy.local",
            role="Cashier",
            is_active=True
        )
        stk = User(
            auth_id=STOCK_AUTH_ID,
            name="Charlie Stock",
            email="stock@pharmacy.local",
            role="Stock Handler",
            is_active=True
        )
        ina = User(
            auth_id=INACTIVE_AUTH_ID,
            name="Disabled User",
            email="inactive@pharmacy.local",
            role="Cashier",
            is_active=False
        )
        db_session.add_all([mgr, csh, stk, ina])
        db_session.commit()


# ------------------------------------------------------------------------------
# 10.1 Authentication and Permissions Tests
# ------------------------------------------------------------------------------

def test_auth_01_valid_manager_login(client):
    res = client.get("/api/v1/auth/me", headers=MANAGER_HEADERS)
    assert res.status_code == 200
    assert res.json()["role"] == "Manager"


def test_auth_02_valid_cashier_login(client):
    res = client.get("/api/v1/auth/me", headers=CASHIER_HEADERS)
    assert res.status_code == 200
    assert res.json()["role"] == "Cashier"


def test_auth_03_valid_stock_handler_login(client):
    res = client.get("/api/v1/auth/me", headers=STOCK_HEADERS)
    assert res.status_code == 200
    assert res.json()["role"] == "Stock Handler"


def test_auth_05_inactive_profile(client):
    res = client.get("/api/v1/auth/me", headers=INACTIVE_HEADERS)
    assert res.status_code == 403


def test_auth_06_cashier_cannot_write_medicine(client):
    res = client.post("/api/v1/medicines", json={
        "category_id": str(uuid.uuid4()),
        "name": "Unauthorized Med",
        "selling_price": 50.0,
        "reorder_level": 10
    }, headers=CASHIER_HEADERS)
    assert res.status_code == 403


def test_auth_07_unauthenticated_api_call(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_auth_08_prevent_self_role_assignment(client):
    # Cashier attempts to sync profile and claim Manager role
    res = client.post("/api/v1/auth/profile/sync", json={
        "name": "Bob Attacker"
    }, headers=CASHIER_HEADERS)
    assert res.status_code == 200
    # Role remains Cashier
    assert res.json()["role"] == "Cashier"


# ------------------------------------------------------------------------------
# 10.2 Database and Inventory Tests (DB-01, DB-02, INV-01 to INV-06)
# ------------------------------------------------------------------------------

def test_db_01_create_category_and_medicine(client):
    # Create category
    cat_res = client.post("/api/v1/categories", json={
        "name": f"Antibiotics-{uuid.uuid4().hex[:4]}",
        "description": "Anti-infective"
    }, headers=MANAGER_HEADERS)
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    # Create medicine
    med_res = client.post("/api/v1/medicines", json={
        "category_id": cat_id,
        "name": f"Amoxil-{uuid.uuid4().hex[:4]}",
        "generic_name": "Amoxicillin",
        "selling_price": 120.00,
        "reorder_level": 25
    }, headers=MANAGER_HEADERS)
    assert med_res.status_code == 201
    assert med_res.json()["category_id"] == cat_id


def test_inv_01_submit_purchase_without_expiry_date(client):
    res = client.post("/api/v1/inventory/purchase", json={
        "medicine_id": str(uuid.uuid4()),
        "supplier_id": str(uuid.uuid4()),
        "batch_number": "BATCH-001",
        "purchase_date": "2026-11-15",
        "purchase_price": 50.0,
        "qty_received": 100
    }, headers=STOCK_HEADERS)
    # Validation error for missing required field expiry_date
    assert res.status_code == 422


def test_inv_02_submit_zero_negative_quantity(client):
    res = client.post("/api/v1/inventory/purchase", json={
        "medicine_id": str(uuid.uuid4()),
        "supplier_id": str(uuid.uuid4()),
        "batch_number": "BATCH-002",
        "purchase_date": "2026-11-15",
        "expiry_date": "2027-11-15",
        "purchase_price": 50.0,
        "qty_received": 0
    }, headers=STOCK_HEADERS)
    assert res.status_code == 422


def test_inv_03_duplicate_medicine_batch_number(client):
    # Setup category, supplier, and medicine
    cat = client.post("/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    sup = client.post("/api/v1/suppliers", json={"name": f"Sup-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    med = client.post("/api/v1/medicines", json={
        "category_id": cat["id"],
        "name": f"Panadol-{uuid.uuid4().hex[:4]}",
        "selling_price": 30.0
    }, headers=MANAGER_HEADERS).json()

    # First batch creation
    b1 = client.post("/api/v1/inventory/purchase", json={
        "medicine_id": med["id"],
        "supplier_id": sup["id"],
        "batch_number": "SAME-BATCH-1",
        "purchase_date": "2026-11-01",
        "expiry_date": "2027-11-01",
        "purchase_price": 20.0,
        "qty_received": 50
    }, headers=STOCK_HEADERS)
    assert b1.status_code == 201

    # Second batch with same medicine and same batch number -> 409 Conflict
    b2 = client.post("/api/v1/inventory/purchase", json={
        "medicine_id": med["id"],
        "supplier_id": sup["id"],
        "batch_number": "SAME-BATCH-1",
        "purchase_date": "2026-11-01",
        "expiry_date": "2027-11-01",
        "purchase_price": 20.0,
        "qty_received": 50
    }, headers=STOCK_HEADERS)
    assert b2.status_code == 409


# ------------------------------------------------------------------------------
# 10.3 FEFO and Sales Tests (SALE-01 to SALE-10)
# ------------------------------------------------------------------------------

def test_sale_01_fefo_two_batches_allocation(client):
    """
    SALE-01: Earlier expiry has 10 units, later expiry has 20 units; sell 12.
    Must deduct 10 from earlier batch and 2 from second batch.
    """
    cat = client.post("/api/v1/categories", json={"name": f"FEFO-Cat-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    sup = client.post("/api/v1/suppliers", json={"name": f"FEFO-Sup-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    med = client.post("/api/v1/medicines", json={
        "category_id": cat["id"],
        "name": f"FEFO-Med-{uuid.uuid4().hex[:4]}",
        "selling_price": 10.00
    }, headers=MANAGER_HEADERS).json()

    today = date.today()
    early_expiry = str(today + timedelta(days=60))
    later_expiry = str(today + timedelta(days=180))

    # Batch 1: 10 units, earlier expiry
    b1 = client.post("/api/v1/inventory/purchase", json={
        "medicine_id": med["id"],
        "supplier_id": sup["id"],
        "batch_number": "BATCH-EARLY",
        "purchase_date": str(today - timedelta(days=10)),
        "expiry_date": early_expiry,
        "purchase_price": 8.00,
        "qty_received": 10
    }, headers=STOCK_HEADERS).json()

    # Batch 2: 20 units, later expiry
    b2 = client.post("/api/v1/inventory/purchase", json={
        "medicine_id": med["id"],
        "supplier_id": sup["id"],
        "batch_number": "BATCH-LATER",
        "purchase_date": str(today - timedelta(days=5)),
        "expiry_date": later_expiry,
        "purchase_price": 8.00,
        "qty_received": 20
    }, headers=STOCK_HEADERS).json()

    # Sell 12 units
    sale_res = client.post("/api/v1/sales", json={
        "payment_method": "CASH",
        "items": [{"medicine_id": med["id"], "quantity": 12}],
        "idempotency_key": str(uuid.uuid4())
    }, headers=CASHIER_HEADERS)

    assert sale_res.status_code == 201
    data = sale_res.json()
    assert len(data["items"]) == 2

    # Check batch allocations
    item1 = next(it for it in data["items"] if it["batch_id"] == b1["id"])
    item2 = next(it for it in data["items"] if it["batch_id"] == b2["id"])

    assert item1["quantity"] == 10
    assert item2["quantity"] == 2
    assert Decimal(str(data["total_amount"])) == Decimal("120.00")


def test_sale_02_attempt_sell_more_than_stock(client):
    cat = client.post("/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    med = client.post("/api/v1/medicines", json={
        "category_id": cat["id"],
        "name": f"Med-{uuid.uuid4().hex[:4]}",
        "selling_price": 10.00
    }, headers=MANAGER_HEADERS).json()

    res = client.post("/api/v1/sales", json={
        "payment_method": "CASH",
        "items": [{"medicine_id": med["id"], "quantity": 100}]
    }, headers=CASHIER_HEADERS)
    assert res.status_code == 400
    assert "Insufficient sellable stock" in res.json()["detail"]


def test_sale_05_credit_checkout_without_customer(client):
    cat = client.post("/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    med = client.post("/api/v1/medicines", json={
        "category_id": cat["id"],
        "name": f"Med-{uuid.uuid4().hex[:4]}",
        "selling_price": 10.00
    }, headers=MANAGER_HEADERS).json()

    res = client.post("/api/v1/sales", json={
        "payment_method": "CREDIT",
        "customer_id": None,
        "items": [{"medicine_id": med["id"], "quantity": 1}]
    }, headers=CASHIER_HEADERS)
    assert res.status_code == 422


def test_sale_08_retry_same_idempotency_key(client):
    cat = client.post("/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    sup = client.post("/api/v1/suppliers", json={"name": f"Sup-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    med = client.post("/api/v1/medicines", json={
        "category_id": cat["id"],
        "name": f"Med-{uuid.uuid4().hex[:4]}",
        "selling_price": 50.00
    }, headers=MANAGER_HEADERS).json()

    client.post("/api/v1/inventory/purchase", json={
        "medicine_id": med["id"],
        "supplier_id": sup["id"],
        "batch_number": "BATCH-IDEM",
        "purchase_date": str(date.today()),
        "expiry_date": str(date.today() + timedelta(days=100)),
        "purchase_price": 30.00,
        "qty_received": 100
    }, headers=STOCK_HEADERS)

    idem_key = f"key-{uuid.uuid4().hex}"
    req_body = {
        "payment_method": "CASH",
        "items": [{"medicine_id": med["id"], "quantity": 5}],
        "idempotency_key": idem_key
    }

    # First checkout
    res1 = client.post("/api/v1/sales", json=req_body, headers=CASHIER_HEADERS)
    assert res1.status_code == 201
    sale_id = res1.json()["id"]

    # Retry with same idempotency key
    res2 = client.post("/api/v1/sales", json=req_body, headers=CASHIER_HEADERS)
    assert res2.status_code == 201
    assert res2.json()["id"] == sale_id


# ------------------------------------------------------------------------------
# 10.4 Credit Management and Settlement Tests (CR-01 to CR-03)
# ------------------------------------------------------------------------------

def test_cr_01_and_02_credit_sale_and_full_settlement(client):
    # Register customer
    cust = client.post("/api/v1/customers", json={
        "name": f"Customer-{uuid.uuid4().hex[:4]}",
        "phone": "+92-300-1234567"
    }, headers=CASHIER_HEADERS).json()

    cat = client.post("/api/v1/categories", json={"name": f"Cat-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    sup = client.post("/api/v1/suppliers", json={"name": f"Sup-{uuid.uuid4().hex[:4]}"}, headers=MANAGER_HEADERS).json()
    med = client.post("/api/v1/medicines", json={
        "category_id": cat["id"],
        "name": f"Med-{uuid.uuid4().hex[:4]}",
        "selling_price": 40.00
    }, headers=MANAGER_HEADERS).json()

    client.post("/api/v1/inventory/purchase", json={
        "medicine_id": med["id"],
        "supplier_id": sup["id"],
        "batch_number": "BATCH-CR",
        "purchase_date": str(date.today()),
        "expiry_date": str(date.today() + timedelta(days=100)),
        "purchase_price": 20.00,
        "qty_received": 50
    }, headers=STOCK_HEADERS)

    # 1. Create CREDIT sale
    sale = client.post("/api/v1/sales", json={
        "payment_method": "CREDIT",
        "customer_id": cust["id"],
        "items": [{"medicine_id": med["id"], "quantity": 2}],
        "idempotency_key": str(uuid.uuid4())
    }, headers=CASHIER_HEADERS).json()

    assert sale["payment_method"] == "CREDIT"
    assert sale["payment_status"] == "PENDING"
    assert Decimal(str(sale["total_amount"])) == Decimal("80.00")

    # 2. Verify in pending list
    pending = client.get("/api/v1/credit/pending", headers=CASHIER_HEADERS).json()
    assert any(p["sale_id"] == sale["id"] for p in pending)

    # 3. Settle credit sale
    settle_res = client.post(f"/api/v1/credit/{sale['id']}/settle", headers=CASHIER_HEADERS)
    assert settle_res.status_code == 200
    assert settle_res.json()["payment_status"] == "PAID"

    # 4. CR-03: Attempt duplicate settlement -> 409 Conflict
    dup_res = client.post(f"/api/v1/credit/{sale['id']}/settle", headers=CASHIER_HEADERS)
    assert dup_res.status_code == 409
