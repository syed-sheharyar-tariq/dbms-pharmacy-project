# Pharmacy Database Architecture & ERD Specification

This directory contains the authoritative Entity-Relationship Diagram (ERD) and architectural notes for the Pharmacy Inventory & Sales Management System.

## Tables & Cardinality Summary

1. **`users`**: Application profiles tied to Supabase Auth (`auth_id`).
   * Roles: `Manager`, `Cashier`, `Stock Handler`.
   * Cardinalities:
     * 1 user $\rightarrow$ Many sales (as `cashier_id`).
     * 1 user $\rightarrow$ Many sales (as `settled_by`).
     * 1 user $\rightarrow$ Many attachments (as `uploaded_by`).

2. **`categories`**: Medicine classification.
   * Cardinality: 1 category $\rightarrow$ Many medicines. `ON DELETE RESTRICT`.

3. **`suppliers`**: Pharmaceutical distributors.
   * Cardinality: 1 supplier $\rightarrow$ Many inventory batches. `ON DELETE RESTRICT`.

4. **`medicines`**: Master medicine catalog.
   * Prices stored in `NUMERIC(12,2)`.
   * Cardinality: 1 medicine $\rightarrow$ Many inventory batches. `ON DELETE RESTRICT`.

5. **`inventory_batches`**: Stock batches with expiry dates.
   * Essential for First Expiring, First Out (FEFO) allocation.
   * Uniqueness: `UNIQUE (medicine_id, batch_number)`.
   * Constraint: `expiry_date >= purchase_date`.
   * Constraint: `0 <= qty_available <= qty_received`.

6. **`customers`**: Registered customers for sales and credit tracking.
   * Phone number indexed for fast POS lookup.
   * Cardinality: 1 customer $\rightarrow$ Many sales. `ON DELETE RESTRICT`.

7. **`sales`**: Atomic cash and credit sale headers.
   * `sale_number`: Formatted unique string (e.g., `SALE-20261115-XXXX`).
   * `idempotency_key`: Client-generated UUID to prevent double-charging or duplicate checkout.
   * Payment workflow constraints:
     * `CASH` must be `PAID` with no settlement metadata.
     * `CREDIT` requires a non-null `customer_id`.
     * `CREDIT` starts `PENDING` and transitions to `PAID` with non-null `settled_at` and `settled_by`.

8. **`sale_items`**: Batched line items.
   * Stores snapshot `unit_price` at sale time.
   * Fulfills sales across multiple batches when necessary.

9. **`attachments`**: Metadata for Supabase Storage uploads (receipts, medicine images, batch documentation).

## Diagram Source
See `schema.mermaid` for the full Mermaid diagram definition.
