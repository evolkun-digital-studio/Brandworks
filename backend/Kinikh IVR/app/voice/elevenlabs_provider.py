"""ElevenLabs voice provider — TTS only."""

from __future__ import annotations

from collections.abc import AsyncIterator

from loguru import logger

from app.core.exceptions import ExternalServiceError
from app.voice.base import BaseVoiceProvider
from app.voice.elevenlabs import ElevenLabsClient


class ElevenLabsProvider(BaseVoiceProvider):
    """ElevenLabs text-to-speech provider. Does not support transcription."""

    def __init__(self, client: ElevenLabsClient | None = None) -> None:
        self._client = client or ElevenLabsClient()

    @property
    def supports_transcription(self) -> bool:
        return False

    async def transcribe(self, audio_bytes: bytes, *, language: str | None = None) -> str:
        raise NotImplementedError("ElevenLabsProvider does not support transcription")

    async def synthesize(self, text: str, *, language: str = "en", voice: str = "alloy") -> bytes:
        try:
            return await self._client.synthesize(text, language)
        except Exception as exc:
            logger.error(f"[elevenlabs_provider] TTS failed: {exc}")
            raise ExternalServiceError("ElevenLabs", str(exc)) from exc

    async def synthesize_stream(
        self, text: str, *, language: str = "en", voice: str = "alloy"
    ) -> AsyncIterator[bytes]:
        try:
            async for chunk in self._client.synthesize_stream(text, language):
                yield chunk
        except Exception as exc:
            logger.error(f"[elevenlabs_provider] TTS stream failed: {exc}")
            raise ExternalServiceError("ElevenLabs", str(exc)) from exc
