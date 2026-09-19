"""Lead data extraction from call transcript using OpenAI."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from loguru import logger

from app.ai.openai_client import OpenAIClient, get_openai_client
from app.ai.prompt_manager import PromptManager


class LeadExtractor:
    """Parses a raw transcript into a structured lead JSON."""

    _REQUIRED_KEYS: frozenset[str] = frozenset(
        {"name", "phone", "email", "department", "requirement", "summary", "language", "timestamp"}
    )

    def __init__(self, client: OpenAIClient | None = None) -> None:
        self._client = client or get_openai_client()
        self._prompt_manager = PromptManager()

    async def extract(self, transcript: str, caller_phone: str) -> dict[str, Any]:
        """Extract structured lead data from a call transcript.

        Returns a dict with all required keys guaranteed; missing values default
        to None, empty string, or the caller's phone number as appropriate.
        """
        prompt = self._prompt_manager.lead_extraction(transcript, caller_phone)

        try:
            data: dict[str, Any] = await self._client.chat_json(
                [
                    {
                        "role": "system",
                        "content": "You extract structured data. Return only valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=512,
            )
        except Exception as exc:
            logger.error(f"Lead extraction failed: {exc}")
            data = {}

        # Guarantee all required fields are present.
        data.setdefault("phone", caller_phone)
        data.setdefault("timestamp", datetime.now(UTC).isoformat())
        data.setdefault("language", "en")
        data.setdefault("summary", "")

        for key in ("name", "email", "department", "requirement", "additional_notes"):
            data.setdefault(key, None)

        return data
