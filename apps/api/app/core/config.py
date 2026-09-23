from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "CartelNet API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    DEFAULT_ORG_ID: str = "org-cartelnet-demo"

    # Security
    SECRET_KEY: str = "cartelnet-default-insecure-dev-secret-key-change-in-prod"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    # Database
    DATABASE_URL: str = "sqlite:///./cartelnet_dev.db"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str, info):
        # Strict PostgreSQL enforcement for production
        env = info.data.get("ENVIRONMENT", "development")
        if env == "production":
            if not v.startswith("postgresql://") and not v.startswith("postgresql+psycopg://") and not v.startswith("postgresql+asyncpg://"):
                raise ValueError("Production environment strictly requires a PostgreSQL connection string (postgresql://...). SQLite is forbidden in production.")
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
DEFAULT_ORG_ID = settings.DEFAULT_ORG_ID
