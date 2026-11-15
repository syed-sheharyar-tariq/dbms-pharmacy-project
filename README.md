# Central Pharmacy Inventory & Sales Management System (v1.0)

A production-grade, transaction-safe Pharmacy Inventory and Point of Sale (POS) application built with **React + Vite**, **Python FastAPI**, and **Supabase (PostgreSQL & Auth & Storage)**.

---

## 1. Technology Stack

* **Frontend:** React 18, Vite, JavaScript, Tailwind CSS, React Router v6, Axios, Lucide React Icons.
* **Backend:** Python 3.11+, FastAPI, SQLAlchemy 2.0 (ORM), Pydantic v2, Uvicorn.
* **Database & Cloud:** Supabase PostgreSQL, Supabase Auth (JWT asymmetric verification via JWKS), Supabase Storage.
* **Architecture:** FEFO (First Expiring, First Out) inventory deduction with pessimistic row locking (`SELECT ... FOR UPDATE`), idempotency key checkout protection, and strict Decimal financial calculations.

---

## 2. Directory Structure

```
pharmacy-management-system/
├── frontend/                     # React + Vite SPA
│   ├── src/
│   │   ├── api/client.js         # Central Axios client with JWT interceptor
│   │   ├── context/AuthContext   # Supabase Auth provider & profile synchronization
│   │   ├── layouts/MainLayout    # Role-based sidebar & navigation
│   │   ├── pages/
│   │   │   ├── auth/             # Login & Manager bootstrap
│   │   │   ├── cashier/          # POS Register & Thermal Receipt view
│   │   │   ├── manager/          # Executive dashboard, medicines, suppliers, reports
│   │   │   ├── stock/            # Stock receiving, batches, expiry alerts
│   │   │   └── shared/           # Sales history & credit settlement
│   │   └── routes/               # Role-based protected routes
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── vercel.json / netlify.toml
├── backend/                      # Python FastAPI REST API
│   ├── app/
│   │   ├── main.py               # FastAPI entrypoint, CORS & error handlers
│   │   ├── database.py           # Database engine & auto-migration runner
│   │   ├── auth.py               # Supabase JWKS asymmetric JWT validator
│   │   ├── dependencies.py       # RBAC role guards (Manager, Cashier, Stock)
│   │   ├── models/               # SQLAlchemy models (User, Medicine, Batch, Sale)
│   │   ├── schemas/              # Pydantic v2 request/response schemas
│   │   ├── services/             # FEFO engine, inventory, credit & reporting
│   │   └── routers/              # Versioned endpoints (/api/v1)
│   ├── tests/                    # Acceptance test suite (AUTH, INV, SALE, CR)
│   ├── requirements.txt
│   └── Dockerfile
├── database/                     # Database Schema of Record
│   ├── migrations/               # Sequential SQL migrations
│   ├── seed_data/seed.sql        # Demo catalog, suppliers, and multi-batch stock
│   ├── schema.sql                # Complete PostgreSQL DDL with RLS & Triggers
│   └── ERD/                      # Mermaid ERD diagrams
├── documentation/                # Full documentation suite
│   ├── architecture.md           # Runtime topology & transaction flow
│   ├── setup-windows.md          # Step-by-step Windows 10 PowerShell guide
│   ├── supabase-setup.md         # Supabase setup, JWKS, & bootstrap guide
│   ├── user-guide.md             # Role workflows for Manager, Cashier, Stock
│   ├── testing-report.md         # Acceptance testing verification report
│   ├── api-reference.md          # REST API endpoint reference
│   └── troubleshooting.md        # Common issues and fixes
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## 3. Quick Start (Windows 10 PowerShell)

### Step 1: Database Setup (Supabase)
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the Supabase **SQL Editor**, paste and run `database/schema.sql`.
3. *(Optional demo data)*: Run `database/seed_data/seed.sql`.
4. In **Authentication -> Providers -> Email**, disable "Confirm email" for immediate staff logins.

### Step 2: Backend Launch
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env with your Supabase DATABASE_URL and SUPABASE_URL
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

### Step 3: Frontend Launch (Second Terminal)
```powershell
cd frontend
npm install
Copy-Item .env.example .env
# Edit .env with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 4. Cloud Deployment Ready

* **Vercel / Netlify:** Pre-configured with `frontend/vercel.json` and `frontend/netlify.toml` for Single Page App routing.
* **Render / Railway / VPS:** Pre-configured with `backend/Dockerfile` and `docker-compose.yml`.

---

## 5. Verification & Tests
To run the automated acceptance test suite:
```powershell
python -m pytest -c backend/pytest.ini backend/tests/test_api_acceptance.py
```
To build the frontend for production:
```powershell
cd frontend
npm run build
```
