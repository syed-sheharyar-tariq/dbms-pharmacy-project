# Architecture Specification
## Pharmacy Inventory & Sales Management System

---

## 1. Runtime Topology

The system operates across three primary layers:
1. **Frontend Client (SPA):** React 18 + Vite running locally at `http://localhost:5173`.
2. **Backend Application Server:** Python FastAPI running locally at `http://localhost:8000`.
3. **Database & Identity:** Cloud-hosted Supabase PostgreSQL and Supabase Auth.

```
Browser (React @ http://localhost:5173)
   │
   │ HTTPS / REST (Authorization: Bearer <Supabase JWT>)
   ▼
FastAPI Server (http://localhost:8000/api/v1)
   │
   │ SQLAlchemy Pool (Session / Direct TLS @ port 5432)
   ▼
Supabase PostgreSQL (Cloud Database of Record)
```

---

## 2. Authentication & Authorization Flow

1. **User Authentication:** 
   * The user enters their email and password in the React interface.
   * React calls the Supabase Auth SDK (`supabase.auth.signInWithPassword`), authenticating against Supabase's hosted identity service.
   * Supabase returns a JWT access token and session metadata.

2. **Backend Verification:**
   * React attaches the access token as a standard HTTP Bearer token: `Authorization: Bearer <token>`.
   * FastAPI's authentication dependency intercepts the request, retrieves the active public keys from Supabase JWKS (`/.well-known/jwks.json`), and verifies the cryptographic signature, expiration, issuer (`iss`), and audience (`aud="authenticated"`).
   * Once validated, FastAPI reads the `sub` claim (Supabase Auth User UUID) and retrieves the corresponding staff record from the `public.users` table.

3. **Role-Based Access Control (RBAC):**
   * Permissions are strictly verified at the router level:
     * **Manager:** Global access to all catalog, category, supplier, stock, sales, credit settlement, user management, and report endpoints.
     * **Cashier:** Point of Sale (POS) checkout, customer registration, personal shift dashboard, own sales history, and permitted credit settlement. Forbidden from modifying medicines, categories, or system configuration.
     * **Stock Handler:** Inventory batch purchasing, batch tracking, stock dashboard, low-stock/expiry alerts, and supplier directory viewing. Forbidden from processing sales or altering medicine pricing.

---

## 3. Database Connection & Concurrency Architecture

* **Database of Record:** Hosted Supabase PostgreSQL.
* **Driver & Protocol:** `psycopg2-binary` connecting over TLS (`sslmode=require`) to port 5432.
* **Connection Pooling:** Connects to Supabase's Session Pooler or direct connection (never the Transaction Pooler) so that row-level locks are maintained across the entire checkout transaction.
* **Locking Strategy:**
  * FEFO checkout executes `SELECT ... FOR UPDATE` on inventory batch rows.
  * Requests are sorted deterministically by `medicine_id` before locking to eliminate transaction deadlocks.
  * In case of stock insufficiency, the entire transaction rolls back cleanly without partial writes.
