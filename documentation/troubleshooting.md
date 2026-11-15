# System Troubleshooting & Diagnostic Guide

This guide covers common errors encountered during local development, database connectivity, or checkout operations, along with actionable fixes.

---

## 1. Local Runtime & Virtual Environment Issues

### 1.1 PowerShell Execution Policy Restriction
* **Symptom:** Running `.\.venv\Scripts\Activate.ps1` returns `PSSecurityException: File cannot be loaded because running scripts is disabled on this system`.
* **Cause:** Windows PowerShell default execution policy blocks unsigned script files.
* **Fix:** Run this safe process-scoped command:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\.venv\Scripts\Activate.ps1
  ```
  *(Never use `Set-ExecutionPolicy Unrestricted -Scope LocalMachine` as it lowers system-wide security).*

### 1.2 Python Command Not Found or Multiple Python Versions
* **Symptom:** `python` runs an unexpected version or displays a version error.
* **Fix:** Use the pinned Python 3.11 executable directly:
  ```powershell
  C:\Users\Fahad\.proto\tools\python\3.11.18\python.exe -m uvicorn app.main:app --reload
  ```

---

## 2. Supabase & Database Connectivity

### 2.1 Connection Timeout or SSL Mismatch
* **Symptom:** `psycopg2.OperationalError: could not connect to server: Connection timed out` or SSL error.
* **Likely Cause:** 
  1. Using port 6543 (Transaction Pooler) instead of port 5432 (Session Pooler).
  2. Missing `?sslmode=require` query parameter in `DATABASE_URL`.
* **Fix:** Ensure your connection URI in `backend/.env` has this exact structure:
  ```
  DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
  ```

### 2.2 Password Contains Special Characters
* **Symptom:** SQLAlchemy reports an invalid URL or authentication failure despite correct password.
* **Cause:** Characters like `@`, `#`, `:`, or `/` in database passwords must be URL-encoded.
* **Fix:** URL-encode the password in your `.env` connection string (e.g., replace `@` with `%40`, `#` with `%23`).

---

## 3. Authentication & CORS

### 3.1 CORS Policy Block
* **Symptom:** Browser console reports: `Access to XMLHttpRequest at 'http://localhost:8000/...' from origin 'http://localhost:5173' has been blocked by CORS policy`.
* **Fix:** Ensure `FRONTEND_ORIGINS` in `backend/.env` includes `http://localhost:5173,http://127.0.0.1:5173`. Restart the backend after editing.

### 3.2 401 Unauthorized or 403 Forbidden on API Calls
* **Symptom:** API requests fail with 401 or 403.
* **Cause:**
  * 401: Supabase session expired or Bearer token missing. Sign out and sign in again.
  * 403: User profile not synced yet, profile is deactivated, or user's assigned role lacks permission for the endpoint.

---

## 4. FEFO Checkout & Stock Deduction

### 4.1 Insufficient Sellable Stock (400 Bad Request)
* **Symptom:** Checkout fails with `Insufficient sellable stock for 'X'`.
* **Cause:** The database holds batch units, but all available units have an `expiry_date` prior to today's date. Expired units are legally excluded from sellable stock.
* **Fix:** Use **Receive Stock** in the Stock Handler portal to receive fresh unexpired batches.

### 4.2 Duplicate Checkout Protection (Idempotency)
* **Symptom:** Cashier clicks "Complete Checkout" twice quickly on high-latency connection.
* **Behavior:** The backend detects the identical `idempotency_key` and returns the existing sale without deducting batch stock a second time.
