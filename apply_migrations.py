import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from urllib.parse import urlparse

# Load backend/.env
env_path = Path("backend/.env")
load_dotenv(dotenv_path=env_path)

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("Error: DATABASE_URL not found in backend/.env")
    sys.exit(1)

# If db_url has postgresql+psycopg2://, convert to standard postgresql:// for psycopg2.connect
if db_url.startswith("postgresql+psycopg2://"):
    db_url = db_url.replace("postgresql+psycopg2://", "postgresql://", 1)

print(f"Connecting to database...")

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cursor = conn.cursor()
    print("Database connected successfully!")

    # 1. Read and apply schema.sql
    schema_path = Path("database/schema.sql")
    print(f"Applying {schema_path}...")
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    cursor.execute(schema_sql)
    print("Schema applied successfully!")

    # 2. Read and apply seed.sql
    seed_path = Path("database/seed_data/seed.sql")
    if seed_path.exists():
        print(f"Applying demo seed data from {seed_path}...")
        with open(seed_path, "r", encoding="utf-8") as f:
            seed_sql = f.read()
        cursor.execute(seed_sql)
        print("Seed data applied successfully!")

    # 3. Verify tables
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
    """)
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables in public schema ({len(tables)}): {', '.join(tables)}")

    cursor.close()
    conn.close()
    print("All migrations and tables pushed to Supabase successfully!")
except Exception as e:
    print(f"Database error: {e}")
    sys.exit(1)
