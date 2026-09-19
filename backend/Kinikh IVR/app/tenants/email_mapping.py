"""Static fallback department-to-email mapping (overridden by DB config)."""

from __future__ import annotations

DEPARTMENT_EMAIL_MAP: dict[str, str] = {
    "sales": "sales@kinikh.com",
    "support": "support@kinikh.com",
    "billing": "billing@kinikh.com",
    "hr": "hr@kinikh.com",
    "technical": "tech@kinikh.com",
    "general": "info@kinikh.com",
}


def get_department_email(department_name: str) -> str | None:
    return DEPARTMENT_EMAIL_MAP.get(department_name.lower())
