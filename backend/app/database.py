import os
import logging
from pathlib import Path
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from app.config import get_settings

logger = logging.getLogger("pharmacy.database")
settings = get_settings()

# Normalize postgresql:// to postgresql+psycopg2:// if needed
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg2://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

# Engine creation with pool settings appropriate for PostgreSQL / Supabase
engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_recycle=300,
    future=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db() -> Generator[Session, None, None]:
    """FastAPI database session dependency."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def run_database_migrations() -> bool:
    """Executes database/schema.sql against the database if reachable."""
    schema_path = Path(__file__).resolve().parents[2] / "database" / "schema.sql"
    if not schema_path.exists():
        logger.warning(f"Schema file not found at {schema_path}")
        return False

    try:
        with engine.connect() as conn:
            with open(schema_path, "r", encoding="utf-8") as f:
                schema_sql = f.read()
            # Execute schema DDL inside a transaction
            conn.execute(text(schema_sql))
            conn.commit()
            logger.info("Successfully executed database/schema.sql migrations.")
            return True
    except Exception as e:
        logger.error(f"Failed to execute automated database migrations: {e}")
        return False
