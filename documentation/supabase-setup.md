# Supabase Setup & Configuration Runbook

Follow these exact steps to link your Supabase cloud project with the Pharmacy Management System.

---

## 1. Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, select your organization, and provide:
   * **Name:** `pharmacy-management-system`
   * **Database Password:** Store this securely (you will need it for the connection string).
   * **Region:** Choose the region nearest to you (e.g., Southeast Asia, Central Europe, or US).
3. Wait approximately 2 minutes for the database cluster to provision.

---

## 2. Authentication Configuration
1. In your Supabase Dashboard, navigate to **Authentication -> Providers -> Email**.
2. For demonstration / local testing environments:
   * **Toggle off "Confirm email"**.
   * This allows newly registered staff accounts (Manager, Cashier, Stock Handler) to sign in immediately without waiting for confirmation emails.
3. Under **Authentication -> URL Configuration**, ensure:
   * **Site URL:** `http://localhost:5173`
   * **Redirect URLs:** Include `http://localhost:5173/**`

---

## 3. Retrieve Environment Variables
Navigate to **Project Settings -> API**:
1. Copy **Project URL** (e.g. `https://xyzcompany.supabase.co`).
2. Copy **Project API Keys**:
   * `anon` `public` key (for frontend `.env`).
   * `service_role` `secret` key (for backend `.env`).

Navigate to **Project Settings -> Database**:
1. Under **Connection string**, select the **URI** tab.
2. Select **Session Pooler** (or Direct Connection) on **port 5432**.
   * Format: `postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require`

---

## 4. Run SQL Schema Migrations
1. In the Supabase left sidebar, click the **SQL Editor**.
2. Click **New Query**.
3. Open `database/schema.sql` from this project, copy its entire contents, paste it into the editor, and click **Run**.
4. *(Optional Demo Data)*: Create another query, paste `database/seed_data/seed.sql`, and click **Run**.
5. Check the **Table Editor**: you will see all 9 tables (`users`, `categories`, `suppliers`, `medicines`, `inventory_batches`, `customers`, `sales`, `sale_items`, `attachments`) configured with foreign keys, constraints, and indexes.

---

## 5. First Manager Account Bootstrap
1. Open the frontend at `http://localhost:5173/login`.
2. Click **"First time demo setup? Register first Manager account"**.
3. Register your primary administrator email, password, and full name.
4. The system automatically detects that zero users exist and assigns you the **Manager** role!
5. After logging in as Manager, navigate to **Staff Users** to create or assign Cashier and Stock Handler roles to other staff members.
