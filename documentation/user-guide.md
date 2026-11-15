# Pharmacy Management System - User & Workflow Guide

This guide details day-to-day operations for each staff role.

---

## 1. Manager Role Workflows

### 1.1 Executive Business Overview
* Navigate to **Dashboard** to see live metrics: today's sales revenue, cash vs pending credit breakdown, active medicine count, sellable units, and alerts.
* Review recent completed transactions and print official thermal receipts.

### 1.2 Medicine & Price Management
* Navigate to **Medicines** to inspect the pharmaceutical catalog.
* Click **Add New Medicine** to register new medications with brand name, generic formula, category, selling price, and reorder threshold.
* Click the edit icon to adjust pricing or dosage notes.
* Click the trash icon to **safely deactivate** an obsolete item without deleting past transaction records.

### 1.3 Category & Supplier Directories
* Manage therapeutic classes in **Categories**.
* Maintain verified pharmaceutical distributors, phone numbers, and delivery addresses in **Suppliers**.

### 1.4 Business Reports & Audits
* Navigate to **Reports**:
  * **Sales Report:** Filter by custom date ranges to see gross revenue, paid collections, credit receivables, and daily breakdown tables.
  * **Inventory Audit:** Inspect sellable stock, cost basis, reorder alerts, and expired units.
  * **Credit Summary:** View each customer's outstanding balance and historic settlement record.

### 1.5 Staff Access Controls
* Navigate to **Staff Users** to manage user permissions.
* Change user roles dynamically between `Manager`, `Cashier`, and `Stock Handler`.
* Activate or disable employee accounts instantly.

---

## 2. Cashier Role Workflows

### 2.1 Point of Sale (POS) Checkout
1. Navigate to **POS Checkout**.
2. Type in the search box to find medicines by brand name or generic formula.
3. Observe the displayed stock badge—the system displays only unexpired sellable units.
4. Click **Add** to place medicines into the cart.
5. Adjust quantities using the stepper (`+` / `-`).
6. Select **Payment Method**:
   * **CASH:** Immediately marked as `PAID`. Customer selection is optional.
   * **CREDIT:** Customer selection is mandatory. The sale is created with status `PENDING`.
7. Click **Complete Checkout**.
8. The system executes the First Expiring, First Out (FEFO) algorithm:
   * Batches closest to expiration are deducted first.
   * If an item spans multiple batches, line items are allocated across batches automatically.
   * The print receipt window pops up immediately.

### 2.2 Customer Credit Settlement
1. Navigate to **Pending Credit**.
2. Find the customer's pending credit sale.
3. Click **Mark Fully Paid** upon receiving the outstanding balance.
4. The system transitions the status to `PAID`, atomically timestamping `settled_at` and recording your staff ID in `settled_by`.

---

## 3. Stock Handler Workflows

### 3.1 Receiving Shipments
1. Navigate to **Stock Purchase**.
2. Select the medicine and verified supplier.
3. Enter the batch number (from the physical packaging).
4. Enter the purchase date and expiration date.
5. Enter the cost price and received quantity.
6. Click **Commit Inventory Batch**.
7. The batch is instantly added to the inventory pool and available for FEFO sales.

### 3.2 Inventory & Expiry Tracking
1. Navigate to **Inventory Alerts**:
   * **Low Stock Tab:** View medicines requiring reorders.
   * **Expiring Soon (30d) Tab:** View batches approaching expiration to plan promotional sales or rotations.
   * **Expired Stock Tab:** View quarantined expired items excluded from customer sales.
