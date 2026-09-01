import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "AIIA Clinical Trials Dashboard (CTMS)"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "aiia_secret_key_change_in_production_ctms_sih26046"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours for clinical research workflows

    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "aiia_ctms")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    
    # Database URLs
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite+aiosqlite:///./aiia_ctms.db"  # Default fallback for standalone dev/testing if pg not up
    )
    SYNC_DATABASE_URL: str = os.getenv(
        "SYNC_DATABASE_URL", 
        f"sqlite:///./aiia_ctms.db"
    )

    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "*"
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
