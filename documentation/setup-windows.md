# Windows 10 PowerShell Local Setup Guide

Follow this guide to run the frontend and backend locally on Windows 10.

---

## 1. Prerequisites Check
Open PowerShell as a standard user:
```powershell
python --version   # Should report Python 3.11.x or 3.12.x
node --version     # Should report Node v18+ or v20+
npm --version      # Should report npm v9+ or v10+
git --version      # Should report Git installed
```

---

## 2. Backend Setup (Terminal 1)

1. Open PowerShell and navigate to the backend directory:
   ```powershell
   cd "d:\DBMS Project2\backend"
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```
   *Note: If PowerShell displays a script execution policy restriction, run this safe session command:*
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\.venv\Scripts\Activate.ps1
   ```

3. Upgrade pip and install all dependencies:
   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```
   *Paste your Supabase PostgreSQL connection string into `DATABASE_URL` and your Supabase project URL into `SUPABASE_URL`.*

5. Start the FastAPI backend server:
   ```powershell
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   Verify by opening `http://127.0.0.1:8000/health` or `http://127.0.0.1:8000/docs` in your browser.

---

## 3. Frontend Setup (Terminal 2)

1. Open a second PowerShell terminal and navigate to the frontend directory:
   ```powershell
   cd "d:\DBMS Project2\frontend"
   ```

2. Install npm packages:
   ```powershell
   npm install
   ```

3. Configure frontend environment variables:
   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```
   *Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.*

4. Launch the Vite development server:
   ```powershell
   npm run dev
   ```

5. Open your web browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 4. Shutting Down
Press `Ctrl + C` in each terminal to cleanly stop the FastAPI and Vite servers.
Your database data remains safely stored online in Supabase.
