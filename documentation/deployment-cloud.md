# Cloud Deployment Guide: Vercel (Frontend) & Render / Railway (Backend)

This guide walks you through deploying the Pharmacy Management System to production on **Vercel** (for the React SPA frontend) and **Render / Railway / VPS** (for the FastAPI backend), connected to your **Supabase** cloud database and auth.

---

## 1. Supabase Preparation (Already Provisioned)
* **Project ID / Ref:** `jjwzvsamqsujsozgjzid`
* **Region:** `aws-0-ap-southeast-1`
* **Project URL:** `https://jjwzvsamqsujsozgjzid.supabase.co`
* **Session Pooler (Port 5432):** `aws-0-ap-southeast-1.pooler.supabase.com:5432`

### Run Schema Migrations:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/jjwzvsamqsujsozgjzid).
2. Open **SQL Editor** in the left menu.
3. Paste the contents of `database/schema.sql` and click **Run**.
4. *(Optional Demo Seed)*: Run `database/seed_data/seed.sql` to populate sample categories, medicines, suppliers, and multi-batch stock.
5. In **Authentication -> Providers -> Email**, disable **"Confirm email"** for instant staff login.

---

## 2. Deploy Frontend to Vercel

1. Push your repository to **GitHub**:
   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

2. Sign in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. **Configure Project Settings**:
   * **Root Directory:** Click **Edit** and select `frontend`.
   * **Framework Preset:** `Vite` (automatically detected).
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
5. **Add Environment Variables in Vercel**:
   | Variable Name | Value |
   | :--- | :--- |
   | `VITE_SUPABASE_URL` | `https://jjwzvsamqsujsozgjzid.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | *(Your public anon key from Supabase Dashboard -> Project Settings -> API)* |
   | `VITE_API_BASE_URL` | `https://your-backend-service.onrender.com/api/v1` *(or your local URL for development)* |
6. Click **Deploy**. Vercel will build and assign you a live HTTPS domain (e.g., `https://pharmacy-system.vercel.app`).
   * *Note: `frontend/vercel.json` already contains SPA rewrite rules so client-side navigation (`/cashier/pos`, `/manager/dashboard`) works on page refresh.*

---

## 3. Deploy Backend to Render (Free / Starter Python Hosting)

Render provides free/low-cost Web Services with automatic GitHub continuous deployment.

1. Sign in to [Render](https://render.com) and click **New + -> Web Service**.
2. Connect your GitHub repository.
3. **Configure the Service**:
   * **Name:** `pharmacy-api`
   * **Region:** `Singapore` (matches your `ap-southeast-1` Supabase region for low latency).
   * **Root Directory:** `backend`
   * **Runtime:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Add Environment Variables in Render**:
   | Variable Name | Value |
   | :--- | :--- |
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | `postgresql+psycopg2://postgres.jjwzvsamqsujsozgjzid:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require` |
   | `SUPABASE_URL` | `https://jjwzvsamqsujsozgjzid.supabase.co` |
   | `SUPABASE_ANON_KEY` | *(Your anon public key)* |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(Your service_role key from Project Settings -> API)* |
   | `FRONTEND_ORIGINS` | `https://your-app.vercel.app,http://localhost:5173` |
   | `APP_TIMEZONE` | `Asia/Karachi` |
5. Click **Create Web Service**.
6. Once deployed, copy your Render service URL (e.g. `https://pharmacy-api.onrender.com`) and paste `https://pharmacy-api.onrender.com/api/v1` as the `VITE_API_BASE_URL` in your Vercel project settings.

---

## 4. Alternative: Deploy Backend via Docker / Any VPS (Ubuntu / DigitalOcean / Hetzner)

If using a Linux VPS or cloud VM:
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
# Edit backend/.env with your Supabase credentials
docker compose up -d --build
```
The FastAPI backend will run on port 8000 and the Nginx-served frontend on port 5173 / 80.
