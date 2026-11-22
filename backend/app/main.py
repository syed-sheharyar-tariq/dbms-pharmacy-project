import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from sqlalchemy import text

from app.config import get_settings
from app.database import engine, run_database_migrations
from app.routers import (
    auth,
    medicines,
    categories,
    suppliers,
    customers,
    inventory,
    sales,
    credit,
    alerts,
    dashboards,
    reports,
    attachments
)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("pharmacy.main")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Pharmacy Management System API...")
    # Attempt to apply database schema / migrations on startup if database is reachable
    try:
        run_database_migrations()
    except Exception as e:
        logger.warning(f"Startup database check note: {e}")
    yield
    logger.info("Shutting down Pharmacy Management System API...")


app = FastAPI(
    title="Pharmacy Inventory & Sales Management System API",
    version="1.0.0",
    description="Production REST API for Pharmacy Inventory, FEFO Sales, and Credit Management.",
    lifespan=lifespan
)

# CORS Middleware (supports local development and all Vercel preview/production domains)
cleaned_cors_origins = [orig for orig in settings.cors_origins if "*" not in orig] or [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cleaned_cors_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health & Readiness Check Endpoint
@app.get("/health", tags=["System Health"])
def health_check():
    """Checks application and database readiness without exposing secrets."""
    db_connected = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_connected = True
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        db_connected = False

    return {
        "status": "healthy" if db_connected else "degraded",
        "app": "running",
        "database_connected": db_connected,
        "environment": settings.ENVIRONMENT,
        "timezone": settings.APP_TIMEZONE
    }


# Standard Error Shape Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation Error",
            "detail": jsonable_encoder(exc.errors()),
            "status_code": 422
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please contact the administrator.",
            "status_code": 500
        }
    )


# Register Versioned API Routers (/api/v1)
api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(medicines.router, prefix=api_prefix)
app.include_router(categories.router, prefix=api_prefix)
app.include_router(suppliers.router, prefix=api_prefix)
app.include_router(customers.router, prefix=api_prefix)
app.include_router(inventory.router, prefix=api_prefix)
app.include_router(sales.router, prefix=api_prefix)
app.include_router(credit.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(dashboards.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(attachments.router, prefix=api_prefix)
