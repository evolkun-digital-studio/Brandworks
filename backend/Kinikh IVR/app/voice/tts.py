"""TextToSpeech — TTS wrapper with streaming and provider fallback."""

from __future__ import annotations

from collections.abc import AsyncIterator

from loguru import logger

from app.core.exceptions import ExternalServiceError
from app.voice.base import BaseVoiceProvider


class TextToSpeech:
    """Wraps a primary TTS provider with optional fallback on failure.

    Falls back to the secondary provider when the primary returns empty bytes
    or raises ExternalServiceError. Returns b"" only if all providers fail.
    """

    def __init__(
        self,
        primary: BaseVoiceProvider,
        fallback: BaseVoiceProvider | None = None,
    ) -> None:
        self._primary = primary
        self._fallback = fallback

    async def synthesize(self, text: str, *, language: str = "en", voice: str = "alloy") -> bytes:
        """Synthesize text to audio bytes, falling back on empty or error."""
        try:
            audio = await self._primary.synthesize(text, language=language, voice=voice)
            if audio:
                return audio
            logger.warning("[tts] primary returned empty audio")
        except ExternalServiceError as exc:
            logger.warning(f"[tts] primary failed: {exc}")

        if self._fallback:
            logger.warning("[tts] using fallback provider")
            try:
                return await self._fallback.synthesize(text, language=language, voice=voice)
            except Exception as exc:
                logger.error(f"[tts] fallback failed: {exc}")
        return b""

    async def synthesize_stream(
        self, text: str, *, language: str = "en", voice: str = "alloy"
    ) -> AsyncIterator[bytes]:
        """Stream audio chunks, falling back if primary yields nothing or errors."""
        yielded = False
        try:
            async for chunk in self._primary.synthesize_stream(
                text, language=language, voice=voice
            ):
                yield chunk
                yielded = True
        except ExternalServiceError as exc:
            logger.warning(f"[tts] primary stream failed: {exc}")

        if not yielded and self._fallback:
            logger.warning("[tts] primary stream empty, using fallback")
            try:
                async for chunk in self._fallback.synthesize_stream(
                    text, language=language, voice=voice
                ):
                    yield chunk
            except Exception as exc:
                logger.error(f"[tts] fallback stream failed: {exc}")
