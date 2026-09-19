"""OpenAI voice provider — Whisper STT + OpenAI TTS."""

from __future__ import annotations

from collections.abc import AsyncIterator

from loguru import logger

from app.ai.openai_client import OpenAIClient, get_openai_client
from app.core.exceptions import ExternalServiceError
from app.voice.base import BaseVoiceProvider


class OpenAIVoiceProvider(BaseVoiceProvider):
    """Whisper-1 STT + tts-1 TTS backed by the shared OpenAIClient.

    Delegates all retry/backoff to the underlying OpenAIClient. Re-raises
    exhausted failures as ExternalServiceError for callers to handle.
    """

    def __init__(self, client: OpenAIClient | None = None) -> None:
        self._client = client or get_openai_client()

    @property
    def supports_transcription(self) -> bool:
        return True

    async def transcribe(self, audio_bytes: bytes, *, language: str | None = None) -> str:
        try:
            return await self._client.transcribe(audio_bytes, language=language)
        except Exception as exc:
            logger.error(f"[openai_provider] STT failed: {exc}")
            raise ExternalServiceError("OpenAI", str(exc)) from exc

    async def synthesize(self, text: str, *, language: str = "en", voice: str = "alloy") -> bytes:
        try:
            return await self._client.tts(text, voice=voice)
        except Exception as exc:
            logger.error(f"[openai_provider] TTS failed: {exc}")
            raise ExternalServiceError("OpenAI", str(exc)) from exc

    async def synthesize_stream(
        self, text: str, *, language: str = "en", voice: str = "alloy"
    ) -> AsyncIterator[bytes]:
        try:
            async for chunk in self._client.tts_stream(text, voice=voice):
                yield chunk
        except Exception as exc:
            logger.error(f"[openai_provider] TTS stream failed: {exc}")
            raise ExternalServiceError("OpenAI", str(exc)) from exc
