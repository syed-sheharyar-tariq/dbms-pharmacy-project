import os
from functools import lru_cache
from pathlib import Path
from typing import List
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_ENV = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_HOST: str = "127.0.0.1"
    APP_PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/postgres"

    # Supabase Configuration
    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_ANON_KEY: str = "placeholder-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-service-key"
    SUPABASE_JWT_ISSUER: str = ""
    SUPABASE_JWKS_URL: str = ""

    # Application settings
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    APP_TIMEZONE: str = "Asia/Karachi"

    model_config = SettingsConfigDict(
        env_file=(str(ROOT_ENV), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @computed_field
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGINS.split(",") if origin.strip()]

    @computed_field
    @property
    def jwt_issuer(self) -> str:
        if self.SUPABASE_JWT_ISSUER:
            return self.SUPABASE_JWT_ISSUER
        return f"{self.SUPABASE_URL.rstrip('/')}/auth/v1"

    @computed_field
    @property
    def jwks_url(self) -> str:
        if self.SUPABASE_JWKS_URL:
            return self.SUPABASE_JWKS_URL
        return f"{self.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
