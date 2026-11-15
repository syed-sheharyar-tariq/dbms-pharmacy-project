# System Acceptance Testing & Verification Report
## Pharmacy Inventory & Sales Management System (v1.0)

**Date of Execution:** 15 November 2026  
**Test Framework:** Pytest 9.2.0 + FastAPI TestClient + SQLite Static Pool Engine  
**Status:** **16 PASSED, 0 FAILED** (100% Pass Rate)

---

## 1. Test Execution Summary

| Test ID | Test Category | Description | Status | Evidence / Verification |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Authentication | Valid Manager login & profile fetch | **PASS** | `test_auth_01_valid_manager_login` returned HTTP 200 with role `'Manager'`. |
| **AUTH-02** | Authentication | Valid Cashier login & navigation | **PASS** | `test_auth_02_valid_cashier_login` returned HTTP 200 with role `'Cashier'`. |
| **AUTH-03** | Authentication | Valid Stock Handler login | **PASS** | `test_auth_03_valid_stock_handler_login` returned HTTP 200 with role `'Stock Handler'`. |
| **AUTH-05** | Authentication | Inactive staff profile denied | **PASS** | `test_auth_05_inactive_profile` returned HTTP 403 Forbidden. |
| **AUTH-06** | Authorization | Cashier cannot write medicines | **PASS** | `test_auth_06_cashier_cannot_write_medicine` returned HTTP 403 Forbidden. |
| **AUTH-07** | Authentication | Unauthenticated request rejected | **PASS** | `test_auth_07_unauthenticated_api_call` returned HTTP 401 Unauthorized. |
| **AUTH-08** | Authorization | Prevent staff self-role escalation | **PASS** | `test_auth_08_prevent_self_role_assignment` preserved original role `'Cashier'`. |
| **DB-01** | Database/Catalog | Category & medicine creation | **PASS** | `test_db_01_create_category_and_medicine` persisted with valid FK references. |
| **INV-01** | Inventory Integrity | Purchase rejected without expiry | **PASS** | `test_inv_01_submit_purchase_without_expiry_date` returned HTTP 422. |
| **INV-02** | Inventory Integrity | Purchase rejected with zero qty | **PASS** | `test_inv_02_submit_zero_negative_quantity` returned HTTP 422. |
| **INV-03** | Inventory Integrity | Duplicate batch number conflict | **PASS** | `test_inv_03_duplicate_medicine_batch_number` returned HTTP 409 Conflict. |
| **SALE-01** | FEFO Algorithm | 2-batch allocation (10 from early, 2 from late) | **PASS** | `test_sale_01_fefo_two_batches_allocation` allocated exactly 10 and 2. |
| **SALE-02** | Sales Guard | Attempt to sell more than stock | **PASS** | `test_sale_02_attempt_sell_more_than_stock` returned HTTP 400 with rollback. |
| **SALE-05** | Sales Guard | Credit checkout without customer | **PASS** | `test_sale_05_credit_checkout_without_customer` returned HTTP 422. |
| **SALE-08** | Idempotency | Retry same idempotency key | **PASS** | `test_sale_08_retry_same_idempotency_key` returned original sale without re-deducting. |
| **CR-01..03** | Credit Workflow | Credit sale created & settled in full; duplicate rejected | **PASS** | `test_cr_01_and_02_credit_sale_and_full_settlement` verified PENDING -> PAID, settled_by, and 409 on duplicate settlement. |

---

## 2. Frontend Build Verification

* **Command Executed:** `npm run build`
* **Output:**
  ```
  vite v5.4.21 building for production...
  ✓ 1629 modules transformed.
  dist/index.html                   0.55 kB
  dist/assets/index-qupF_vZC.css   26.50 kB
  dist/assets/index-DVmuMDp6.js   576.51 kB
  ✓ built in 4.29s
  ```
* **Status:** Clean production build with zero syntax, JSX, or bundling errors.
