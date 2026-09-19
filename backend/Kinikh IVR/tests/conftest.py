"""Shared pytest fixtures."""

from __future__ import annotations

import os
from unittest.mock import AsyncMock, MagicMock
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

# Set environment variables before importing the app to satisfy pydantic validation.
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("SECRET_KEY", "test-secret-key-that-is-long-enough-for-pydantic")
os.environ.setdefault("OPENAI_API_KEY", "sk-test")
os.environ.setdefault("ELEVENLABS_API_KEY", "el-test")
os.environ.setdefault("ELEVENLABS_VOICE_ID_EN", "test-en-voice")
os.environ.setdefault("ELEVENLABS_VOICE_ID_HI", "test-hi-voice")
os.environ.setdefault("EXOTEL_SID", "test-sid")
os.environ.setdefault("EXOTEL_TOKEN", "test-token")
os.environ.setdefault("EXOTEL_API_KEY", "test-api-key")
os.environ.setdefault("EXOTEL_API_SECRET", "test-api-secret")
os.environ.setdefault("EXOTEL_CALLER_ID", "+910000000000")
os.environ.setdefault("EXOTEL_WEBHOOK_SECRET", "test-webhook-secret")
os.environ.setdefault("SMTP_USERNAME", "test@test.com")
os.environ.setdefault("SMTP_PASSWORD", "test-password")
os.environ.setdefault("SMTP_FROM_EMAIL", "test@test.com")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-that-is-long-enough")
os.environ.setdefault("ADMIN_EMAIL", "admin@test.com")
os.environ.setdefault(
    "ADMIN_PASSWORD_HASH",
    "$2b$12$2OTwnBBhKsYAHfxDIf3pS.GiG1yKl5a1o9/eU.HDJsa9YvZ0TNwBu",  # "dev-only-changeme"
)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
def mock_db_session() -> AsyncMock:
    session = AsyncMock(spec=AsyncSession)
    session.get = AsyncMock(return_value=None)
    session.execute = AsyncMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture
def sample_lead_data() -> dict:
    return {
        "name": "Rajesh Kumar",
        "phone": "+919876543210",
        "email": "rajesh@example.com",
        "department": "sales",
        "requirement": "Need pricing for enterprise plan",
        "summary": "Caller wants enterprise pricing details.",
        "language": "en",
        "timestamp": "2026-06-29T10:00:00Z",
        "additional_notes": None,
    }


@pytest.fixture
def sample_call_sid() -> str:
    return f"CALL{uuid.uuid4().hex[:16].upper()}"
