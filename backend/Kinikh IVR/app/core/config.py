"""Application configuration loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache
import json
from typing import Any

from pydantic import EmailStr, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Safe, obviously-fake values used ONLY when APP_ENV=development and the real
# variable is not set. This lets the app boot (docs, DB, routing, mocked
# pipelines) without any real external credentials. Never used in production —
# see `_fill_dev_defaults` below, which only fires when app_env is development.
_DEV_MOCK_DEFAULTS: dict[str, str] = {
    "secret_key": "dev-insecure-secret-key-do-not-use-in-production-0000000000",
    "openai_api_key": "sk-dev-mock-not-a-real-key",
    "elevenlabs_api_key": "el-dev-mock-not-a-real-key",
    "elevenlabs_voice_id_en": "dev-mock-voice-en",
    "elevenlabs_voice_id_hi": "dev-mock-voice-hi",
    "exotel_sid": "dev-mock-sid",
    "exotel_token": "dev-mock-token",
    "exotel_api_key": "dev-mock-api-key",
    "exotel_api_secret": "dev-mock-api-secret",
    "exotel_caller_id": "+910000000000",
    "exotel_webhook_secret": "dev-mock-webhook-secret",
    "smtp_username": "dev@localhost",
    "smtp_password": "dev-mock-password",
    "smtp_from_email": "dev-mock@example.com",
    "jwt_secret_key": "dev-insecure-jwt-secret-key-do-not-use-in-production-000",
    "admin_email": "dev-admin@example.com",
    # bcrypt hash of "dev-only-changeme" — dev/mock mode only.
    "admin_password_hash": "$2b$12$2OTwnBBhKsYAHfxDIf3pS.GiG1yKl5a1o9/eU.HDJsa9YvZ0TNwBu",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Kinikh IVR"
    app_env: str = "production"
    app_debug: bool = False
    app_host: str = "0.0.0.0"  # noqa: S104
    app_port: int = 8000
    secret_key: str = Field(..., min_length=32)

    # Database
    database_url: str = Field(..., description="Async PostgreSQL URL")
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # Redis
    redis_url: str = "redis://localhost:6379/0"
    redis_max_connections: int = 20

    # OpenAI
    openai_api_key: str = Field(..., description="OpenAI API key")
    openai_model: str = "gpt-4o"
    openai_realtime_model: str = "gpt-4o-realtime-preview"
    openai_temperature: float = 0.2
    openai_max_tokens: int = 1024

    # ElevenLabs
    elevenlabs_api_key: str = Field(..., description="ElevenLabs API key")
    elevenlabs_voice_id_en: str = Field(..., description="English voice ID")
    elevenlabs_voice_id_hi: str = Field(..., description="Hindi voice ID")
    elevenlabs_model_id: str = "eleven_multilingual_v2"

    # Exotel
    exotel_sid: str = Field(..., description="Exotel SID")
    exotel_token: str = Field(..., description="Exotel token")
    exotel_api_key: str = Field(..., description="Exotel API key")
    exotel_api_secret: str = Field(..., description="Exotel API secret")
    exotel_subdomain: str = "api.exotel.com"
    exotel_caller_id: str = Field(..., description="Exotel caller ID")
    exotel_webhook_secret: str = Field(..., description="Exotel webhook HMAC secret")

    # SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = Field(..., description="SMTP username")
    smtp_password: str = Field(..., description="SMTP password")
    smtp_from_email: EmailStr = Field(..., description="Sender email")
    smtp_from_name: str = "Kinikh IVR"
    smtp_use_tls: bool = True

    # JWT
    jwt_secret_key: str = Field(..., min_length=32)
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # Admin login (single operator account — no multi-user auth yet)
    admin_email: EmailStr = Field(..., description="Admin login email")
    admin_password_hash: str = Field(..., description="Bcrypt hash of the admin password")

    # Rate Limiting
    rate_limit_calls_per_minute: int = 60
    rate_limit_burst: int = 10

    # Company
    company_name: str = "Kinikh"
    company_website: str = "https://kinikh.com"
    company_phone: str = ""

    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]

    # Names of fields silently backfilled with mock values (dev mode only).
    mock_credentials_used: list[str] = Field(default_factory=list, exclude=True)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return [origin.strip() for origin in v.split(",")]
        return v

    @model_validator(mode="before")
    @classmethod
    def _fill_dev_mock_defaults(cls, data: Any) -> Any:
        """Allow booting without real external API keys when APP_ENV=development.

        Only fires for the mock/development environment — production still
        requires every credential to be explicitly set, so this can never
        mask a missing secret in a real deployment.
        """
        if not isinstance(data, dict):
            return data
        app_env = str(data.get("app_env", "production")).lower()
        if app_env not in ("development", "dev"):
            return data
        used: list[str] = list(data.get("mock_credentials_used") or [])
        for key, default in _DEV_MOCK_DEFAULTS.items():
            if not data.get(key):
                data[key] = default
                used.append(key)
        data.setdefault(
            "database_url",
            "postgresql+asyncpg://kinikh:password@localhost:5432/kinikh_ivr_dev",
        )
        data["mock_credentials_used"] = used
        return data

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def is_development(self) -> bool:
        return self.app_env.lower() in ("development", "dev")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    if settings.mock_credentials_used:
        from loguru import logger

        logger.warning(
            "APP_ENV=development: running with MOCK credentials for: "
            f"{', '.join(settings.mock_credentials_used)}. "
            "Do not use this mode in production."
        )
    return settings
