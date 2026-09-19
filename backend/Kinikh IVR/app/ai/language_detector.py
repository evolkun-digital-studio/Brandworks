"""Language detection — heuristic fast-path then OpenAI fallback."""

from __future__ import annotations

from loguru import logger

from app.ai.openai_client import OpenAIClient, get_openai_client
from app.ai.prompt_manager import PromptManager

# Devanagari Unicode block: U+0900-U+097F
_DEVANAGARI_START = 0x0900
_DEVANAGARI_END = 0x097F


def _has_devanagari(text: str) -> bool:
    return any(_DEVANAGARI_START <= ord(c) <= _DEVANAGARI_END for c in text)


def _has_latin_words(text: str) -> bool:
    return any(c.isascii() and c.isalpha() for c in text)


class LanguageDetector:
    """Detects language of caller input — en, hi, or hi-en (Hinglish)."""

    _VALID: frozenset[str] = frozenset({"en", "hi", "hi-en"})

    def __init__(self, client: OpenAIClient | None = None) -> None:
        self._client = client or get_openai_client()
        self._prompt_manager = PromptManager()

    async def detect(self, text: str) -> str:
        """Return language code for the given text.

        Uses Devanagari script detection as a fast path to avoid API calls.
        Falls back to LLM classification for romanized Hindi or ambiguous text.
        """
        if not text.strip():
            return "en"

        # Script-based heuristics — covers the majority of cases without an API call.
        has_dev = _has_devanagari(text)
        has_lat = _has_latin_words(text)
        if has_dev and has_lat:
            return "hi-en"
        if has_dev:
            return "hi"

        # LLM path: romanized Hindi or genuinely ambiguous text.
        prompt = self._prompt_manager.language_detection(text)
        try:
            result = await self._client.chat(
                [{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=10,
            )
            result = result.strip().lower()
            return result if result in self._VALID else "en"
        except Exception as exc:
            logger.warning(f"[lang_detector] detection failed: {exc}, defaulting to en")
            return "en"
