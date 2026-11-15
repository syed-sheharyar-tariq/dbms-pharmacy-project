# REST API Reference Manual (v1.0)
## Prefix: `/api/v1`

All requests to protected endpoints require:
`Authorization: Bearer <Supabase-Access-Token>`

---

## 1. Authentication & Profiles (`/auth`)

### `POST /auth/profile/sync`
* **Access:** Authenticated user.
* **Purpose:** Safely initializes or updates profile display name and contact. Role is automatically set to `Manager` if no users exist, or `Cashier` by default.
* **Request:**
  ```json
  { "name": "Dr. Tariq Mahmood", "contact": "+92-300-1112233" }
  ```
* **Response (200):** User profile object.

### `GET /auth/me`
* **Access:** Authenticated user.
* **Response (200):** Current user profile with assigned role and status.

### `GET /auth/users`
* **Access:** Manager.
* **Response (200):** Array of all staff user accounts.

### `PUT /auth/users/{user_id}`
* **Access:** Manager.
* **Request:**
  ```json
  { "role": "Cashier", "is_active": true }
  ```

---

## 2. Medicine Catalog (`/medicines`)

### `GET /medicines`
* **Access:** Manager, Cashier, Stock Handler.
* **Query Params:** `search`, `category_id`, `include_inactive`.
* **Response (200):** List of medicines with calculated `sellable_quantity` and `is_low_stock` flag.

### `POST /medicines`
* **Access:** Manager.
* **Request:**
  ```json
  {
    "category_id": "c0000000-0000-0000-0000-000000000001",
    "name": "Panadol 500mg Tablets",
    "generic_name": "Paracetamol",
    "selling_price": 35.00,
    "reorder_level": 50
  }
  ```

---

## 3. Inventory & Purchasing (`/inventory`)

### `POST /inventory/purchase`
* **Access:** Manager, Stock Handler.
* **Request:**
  ```json
  {
    "medicine_id": "m0000000-0000-0000-0000-000000000001",
    "supplier_id": "s0000000-0000-0000-0000-000000000001",
    "batch_number": "PAN-2026-B1",
    "purchase_date": "2026-11-15",
    "expiry_date": "2027-11-15",
    "purchase_price": 25.00,
    "qty_received": 100
  }
  ```

### `GET /inventory/batches`
* **Access:** Manager, Stock Handler.
* **Response (200):** Ordered list of inventory batches with expiry status.

---

## 4. Sales & POS Checkout (`/sales`)

### `POST /sales`
* **Access:** Manager, Cashier.
* **Request (Cash):**
  ```json
  {
    "payment_method": "CASH",
    "customer_id": null,
    "items": [{ "medicine_id": "m0000000-0000-0000-0000-000000000001", "quantity": 2 }],
    "idempotency_key": "3f8e5f2a-7d1a-4c4f-9e2b-1a2b3c4d5e6f"
  }
  ```
* **Request (Credit):**
  ```json
  {
    "payment_method": "CREDIT",
    "customer_id": "cu000000-0000-0000-0000-000000000001",
    "items": [{ "medicine_id": "m0000000-0000-0000-0000-000000000001", "quantity": 2 }],
    "idempotency_key": "4g9e6f3b-8e2b-5d5g-0f3c-2b3c4d5e6f7g"
  }
  ```

### `GET /sales/{id}/receipt`
* **Access:** Manager, Cashier (authorized).
* **Response (200):** Thermal-formatted receipt payload.

---

## 5. Credit Settlement (`/credit`)

### `GET /credit/pending`
* **Access:** Manager, Cashier.
* **Response (200):** Array of all pending credit sales.

### `POST /credit/{sale_id}/settle`
* **Access:** Manager, Cashier (permitted scope).
* **Response (200):**
  ```json
  {
    "sale_id": "UUID",
    "sale_number": "SALE-20261115-XXXX",
    "payment_status": "PAID",
    "settled_at": "2026-11-15T18:00:00Z",
    "message": "Credit sale SALE-20261115-XXXX has been settled in full."
  }
  ```

---

## 6. Alerts & Reports (`/alerts`, `/reports`, `/dashboard`)

* `GET /alerts/low-stock`
* `GET /alerts/expiring` (batches expiring within 30 days)
* `GET /alerts/expired` (batches past expiration date)
* `GET /dashboard/manager`
* `GET /dashboard/cashier`
* `GET /dashboard/stock`
* `GET /reports/sales?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
* `GET /reports/inventory`
* `GET /reports/credit`
