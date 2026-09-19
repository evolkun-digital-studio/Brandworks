"""VoiceManager — orchestrates STT and TTS via provider abstraction."""

from __future__ import annotations

from collections.abc import AsyncIterator

from loguru import logger

from app.voice.elevenlabs_provider import ElevenLabsProvider
from app.voice.openai_provider import OpenAIVoiceProvider
from app.voice.stt import SpeechToText
from app.voice.tts import TextToSpeech


class VoiceManager:
    """Unified interface for speech-to-text and text-to-speech.

    Default configuration: OpenAI Whisper for STT, ElevenLabs as primary TTS,
    OpenAI TTS as fallback.

    Accepts pre-built SpeechToText / TextToSpeech instances for testing.
    """

    def __init__(
        self,
        stt: SpeechToText | None = None,
        tts: TextToSpeech | None = None,
    ) -> None:
        if stt is None:
            stt = SpeechToText(OpenAIVoiceProvider())
        if tts is None:
            tts = TextToSpeech(ElevenLabsProvider(), fallback=OpenAIVoiceProvider())
        self._stt = stt
        self._tts = tts

    async def transcribe(self, audio_bytes: bytes, language: str | None = None) -> str:
        """Transcribe audio bytes to text. Returns "" on unrecoverable failure."""
        try:
            return await self._stt.transcribe(audio_bytes, language=language)
        except Exception as exc:
            logger.error(f"[voice_manager] transcribe failed: {exc}")
            return ""

    async def synthesize(self, text: str, language: str = "en") -> bytes:
        """Convert text to audio bytes. Returns b"" on unrecoverable failure."""
        try:
            return await self._tts.synthesize(text, language=language)
        except Exception as exc:
            logger.error(f"[voice_manager] synthesize failed: {exc}")
            return b""

    async def synthesize_to_stream(self, text: str, language: str = "en") -> AsyncIterator[bytes]:
        """Stream audio chunks for lower first-byte latency."""
        try:
            async for chunk in self._tts.synthesize_stream(text, language=language):
                yield chunk
        except Exception as exc:
            logger.error(f"[voice_manager] synthesize_stream failed: {exc}")
