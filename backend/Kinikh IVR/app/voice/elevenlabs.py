"""ElevenLabs TTS client — converts text to μ-law audio bytes."""

from __future__ import annotations

from collections.abc import AsyncIterator

import httpx

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceError


class ElevenLabsClient:
    """Async ElevenLabs TTS client supporting Hindi and English voices."""

    _BASE_URL = "https://api.elevenlabs.io/v1"

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.elevenlabs_api_key
        self._model_id = settings.elevenlabs_model_id
        self._voice_ids = {
            "en": settings.elevenlabs_voice_id_en,
            "hi": settings.elevenlabs_voice_id_hi,
            "hi-en": settings.elevenlabs_voice_id_en,
        }

    def _voice_for(self, language: str) -> str:
        return self._voice_ids.get(language, self._voice_ids["en"])

    async def synthesize(self, text: str, language: str = "en") -> bytes:
        """Return complete MP3 audio bytes for the given text."""
        voice_id = self._voice_for(language)
        url = f"{self._BASE_URL}/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": self._api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "model_id": self._model_id,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code != 200:
                raise ExternalServiceError("ElevenLabs", f"TTS failed: {response.text}")
            return response.content

    async def synthesize_stream(self, text: str, language: str = "en") -> AsyncIterator[bytes]:
        """Stream audio chunks for lower latency."""
        voice_id = self._voice_for(language)
        url = f"{self._BASE_URL}/text-to-speech/{voice_id}/stream"
        headers = {
            "xi-api-key": self._api_key,
            "Content-Type": "application/json",
        }
        payload = {
            "text": text,
            "model_id": self._model_id,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
        }
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    raise ExternalServiceError("ElevenLabs", f"Stream failed: {body.decode()}")
                async for chunk in response.aiter_bytes(chunk_size=4096):
                    if chunk:
                        yield chunk
