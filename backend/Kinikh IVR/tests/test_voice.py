"""Voice module tests — providers, STT, TTS, VoiceManager, AudioBuffer."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.exceptions import ExternalServiceError
from app.voice.base import BaseVoiceProvider

# ---------------------------------------------------------------------------
# Shared test helper
# ---------------------------------------------------------------------------


class _MockProvider(BaseVoiceProvider):
    """Configurable BaseVoiceProvider stub for unit tests."""

    def __init__(
        self,
        *,
        transcript: str = "",
        audio: bytes = b"",
        stream_chunks: list[bytes] | None = None,
        transcription_error: Exception | None = None,
        synthesis_error: Exception | None = None,
        stream_error: Exception | None = None,
        transcription_supported: bool = True,
    ) -> None:
        self._transcript = transcript
        self._audio = audio
        self._stream_chunks = stream_chunks if stream_chunks is not None else []
        self._transcription_error = transcription_error
        self._synthesis_error = synthesis_error
        self._stream_error = stream_error
        self._transcription_supported = transcription_supported
        self.transcribe_calls: list = []
        self.synthesize_calls: list = []

    @property
    def supports_transcription(self) -> bool:
        return self._transcription_supported

    async def transcribe(self, audio_bytes, *, language=None):
        self.transcribe_calls.append((audio_bytes, language))
        if self._transcription_error:
            raise self._transcription_error
        return self._transcript

    async def synthesize(self, text, *, language="en", voice="alloy"):
        self.synthesize_calls.append((text, language, voice))
        if self._synthesis_error:
            raise self._synthesis_error
        return self._audio

    async def synthesize_stream(self, text, *, language="en", voice="alloy"):
        if self._stream_error:
            raise self._stream_error
        for chunk in self._stream_chunks:
            yield chunk


# Custom async iterator that raises on first iteration (avoids unreachable yield)
class _ErrorStream:
    def __init__(self, exc: Exception) -> None:
        self._exc = exc

    def __aiter__(self):
        return self

    async def __anext__(self):
        raise self._exc


# ---------------------------------------------------------------------------
# TestBaseVoiceProvider
# ---------------------------------------------------------------------------


class TestBaseVoiceProvider:
    def test_cannot_instantiate_abstract_class(self):
        with pytest.raises(TypeError):
            BaseVoiceProvider()

    def test_default_supports_transcription_false(self):
        class _Stub(BaseVoiceProvider):
            async def transcribe(self, *a, **k):
                return ""

            async def synthesize(self, *a, **k):
                return b""

            async def synthesize_stream(self, *a, **k):
                for _ in ():
                    yield b""

        stub = _Stub()
        assert stub.supports_transcription is False
        assert stub.supports_synthesis is True


# ---------------------------------------------------------------------------
# TestOpenAIVoiceProvider
# ---------------------------------------------------------------------------


class TestOpenAIVoiceProvider:
    def test_supports_transcription(self):
        from app.voice.openai_provider import OpenAIVoiceProvider

        p = OpenAIVoiceProvider(client=MagicMock())
        assert p.supports_transcription is True

    def test_supports_synthesis(self):
        from app.voice.openai_provider import OpenAIVoiceProvider

        p = OpenAIVoiceProvider(client=MagicMock())
        assert p.supports_synthesis is True

    @pytest.mark.asyncio
    async def test_transcribe_delegates_to_client(self):
        from app.voice.openai_provider import OpenAIVoiceProvider

        mock_client = MagicMock()
        mock_client.transcribe = AsyncMock(return_value="hello world")
        p = OpenAIVoiceProvider(client=mock_client)

        result = await p.transcribe(b"audio", language="en")

        assert result == "hello world"
        mock_client.transcribe.assert_called_once_with(b"audio", language="en")

    @pytest.mark.asyncio
    async def test_transcribe_raises_external_service_error(self):
        from app.voice.openai_provider import OpenAIVoiceProvider

        mock_client = MagicMock()
        mock_client.transcribe = AsyncMock(side_effect=RuntimeError("network"))
        p = OpenAIVoiceProvider(client=mock_client)

        with pytest.raises(ExternalServiceError):
            await p.transcribe(b"audio")

    @pytest.mark.asyncio
    async def test_synthesize_returns_audio_bytes(self):
        from app.voice.openai_provider import OpenAIVoiceProvider

        mock_client = MagicMock()
        mock_client.tts = AsyncMock(return_value=b"mp3data")
        p = OpenAIVoiceProvider(client=mock_client)

        result = await p.synthesize("hello", voice="nova")

        assert result == b"mp3data"
        mock_client.tts.assert_called_once_with("hello", voice="nova")

    @pytest.mark.asyncio
    async def test_synthesize_raises_external_service_error(self):
        from app.voice.openai_provider import OpenAIVoiceProvider

        mock_client = MagicMock()
        mock_client.tts = AsyncMock(side_effect=RuntimeError("api down"))
        p = OpenAIVoiceProvider(client=mock_client)

        with pytest.raises(ExternalServiceError):
            await p.synthesize("hello")

    @pytest.mark.asyncio
    async def test_synthesize_stream_yields_chunks(self):
        from app.voice.openai_provider import OpenAIVoiceProvider

        async def _tts_stream(*args, **kwargs):
            yield b"chunk1"
            yield b"chunk2"

        mock_client = MagicMock()
        mock_client.tts_stream = _tts_stream
        p = OpenAIVoiceProvider(client=mock_client)

        chunks = [c async for c in p.synthesize_stream("hello")]

        assert chunks == [b"chunk1", b"chunk2"]

    @pytest.mark.asyncio
    async def test_synthesize_stream_raises_on_error(self):
        from app.voice.openai_provider import OpenAIVoiceProvider

        mock_client = MagicMock()
        mock_client.tts_stream = MagicMock(return_value=_ErrorStream(RuntimeError("stream fail")))
        p = OpenAIVoiceProvider(client=mock_client)

        with pytest.raises(ExternalServiceError):
            async for _ in p.synthesize_stream("hello"):
                pass


# ---------------------------------------------------------------------------
# TestElevenLabsProvider
# ---------------------------------------------------------------------------


class TestElevenLabsProvider:
    def test_supports_transcription_false(self):
        from app.voice.elevenlabs_provider import ElevenLabsProvider

        p = ElevenLabsProvider(client=MagicMock())
        assert p.supports_transcription is False

    def test_supports_synthesis_true(self):
        from app.voice.elevenlabs_provider import ElevenLabsProvider

        p = ElevenLabsProvider(client=MagicMock())
        assert p.supports_synthesis is True

    @pytest.mark.asyncio
    async def test_transcribe_raises_not_implemented(self):
        from app.voice.elevenlabs_provider import ElevenLabsProvider

        p = ElevenLabsProvider(client=MagicMock())
        with pytest.raises(NotImplementedError):
            await p.transcribe(b"audio")

    @pytest.mark.asyncio
    async def test_synthesize_returns_audio(self):
        from app.voice.elevenlabs_provider import ElevenLabsProvider

        mock_client = MagicMock()
        mock_client.synthesize = AsyncMock(return_value=b"elevenlabs_audio")
        p = ElevenLabsProvider(client=mock_client)

        result = await p.synthesize("hi", language="hi")

        assert result == b"elevenlabs_audio"
        mock_client.synthesize.assert_called_once_with("hi", "hi")

    @pytest.mark.asyncio
    async def test_synthesize_raises_on_error(self):
        from app.voice.elevenlabs_provider import ElevenLabsProvider

        mock_client = MagicMock()
        mock_client.synthesize = AsyncMock(side_effect=RuntimeError("api fail"))
        p = ElevenLabsProvider(client=mock_client)

        with pytest.raises(ExternalServiceError):
            await p.synthesize("hello")

    @pytest.mark.asyncio
    async def test_synthesize_stream_yields_chunks(self):
        from app.voice.elevenlabs_provider import ElevenLabsProvider

        async def _mock_stream(*args, **kwargs):
            yield b"a"
            yield b"b"

        mock_client = MagicMock()
        mock_client.synthesize_stream = _mock_stream
        p = ElevenLabsProvider(client=mock_client)

        chunks = [c async for c in p.synthesize_stream("hello", language="en")]

        assert chunks == [b"a", b"b"]

    @pytest.mark.asyncio
    async def test_synthesize_stream_raises_on_error(self):
        from app.voice.elevenlabs_provider import ElevenLabsProvider

        mock_client = MagicMock()
        mock_client.synthesize_stream = MagicMock(
            return_value=_ErrorStream(RuntimeError("stream fail"))
        )
        p = ElevenLabsProvider(client=mock_client)

        with pytest.raises(ExternalServiceError):
            async for _ in p.synthesize_stream("hello"):
                pass


# ---------------------------------------------------------------------------
# TestSpeechToText
# ---------------------------------------------------------------------------


class TestSpeechToText:
    def test_raises_if_provider_lacks_transcription(self):
        from app.voice.stt import SpeechToText

        provider = _MockProvider(transcription_supported=False)
        with pytest.raises(ValueError, match="does not support transcription"):
            SpeechToText(provider)

    @pytest.mark.asyncio
    async def test_returns_transcript_on_success(self):
        from app.voice.stt import SpeechToText

        provider = _MockProvider(transcript="hello world", transcription_supported=True)
        stt = SpeechToText(provider, retry_delay=0)

        result = await stt.transcribe(b"audio", language="en")

        assert result == "hello world"
        assert provider.transcribe_calls == [(b"audio", "en")]

    @pytest.mark.asyncio
    async def test_retries_on_empty_result(self):
        from app.voice.stt import SpeechToText

        call_count = 0

        class _RetryProvider(_MockProvider):
            async def transcribe(self, audio, *, language=None):
                nonlocal call_count
                call_count += 1
                return "" if call_count < 2 else "ok"

        provider = _RetryProvider(transcription_supported=True)
        stt = SpeechToText(provider, max_retries=2, retry_delay=0)

        with patch("asyncio.sleep", AsyncMock()):
            result = await stt.transcribe(b"audio")

        assert result == "ok"
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_retries_on_external_service_error(self):
        from app.voice.stt import SpeechToText

        call_count = 0

        class _FailThenOk(_MockProvider):
            async def transcribe(self, audio, *, language=None):
                nonlocal call_count
                call_count += 1
                if call_count < 2:
                    raise ExternalServiceError("test", "fail")
                return "success"

        provider = _FailThenOk(transcription_supported=True)
        stt = SpeechToText(provider, max_retries=2, retry_delay=0)

        with patch("asyncio.sleep", AsyncMock()):
            result = await stt.transcribe(b"audio")

        assert result == "success"
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_returns_empty_after_max_retries(self):
        from app.voice.stt import SpeechToText

        provider = _MockProvider(transcript="", transcription_supported=True)
        stt = SpeechToText(provider, max_retries=2, retry_delay=0)

        with patch("asyncio.sleep", AsyncMock()):
            result = await stt.transcribe(b"audio")

        assert result == ""
        assert len(provider.transcribe_calls) == 2

    @pytest.mark.asyncio
    async def test_uses_fallback_after_primary_exhaustion(self):
        from app.voice.stt import SpeechToText

        primary = _MockProvider(transcript="", transcription_supported=True)
        fallback = _MockProvider(transcript="fallback result", transcription_supported=True)
        stt = SpeechToText(primary, max_retries=1, retry_delay=0, fallback=fallback)

        result = await stt.transcribe(b"audio")

        assert result == "fallback result"
        assert len(fallback.transcribe_calls) == 1

    @pytest.mark.asyncio
    async def test_skips_fallback_if_no_transcription_support(self):
        from app.voice.stt import SpeechToText

        primary = _MockProvider(transcript="", transcription_supported=True)
        fallback = _MockProvider(transcription_supported=False)
        stt = SpeechToText(primary, max_retries=1, retry_delay=0, fallback=fallback)

        result = await stt.transcribe(b"audio")

        assert result == ""
        assert fallback.transcribe_calls == []

    @pytest.mark.asyncio
    async def test_fallback_failure_returns_empty(self):
        from app.voice.stt import SpeechToText

        primary = _MockProvider(transcript="", transcription_supported=True)
        fallback = _MockProvider(
            transcription_error=RuntimeError("fallback fail"),
            transcription_supported=True,
        )
        stt = SpeechToText(primary, max_retries=1, retry_delay=0, fallback=fallback)

        result = await stt.transcribe(b"audio")

        assert result == ""

    @pytest.mark.asyncio
    async def test_passes_language_to_provider(self):
        from app.voice.stt import SpeechToText

        provider = _MockProvider(transcript="नमस्ते", transcription_supported=True)
        stt = SpeechToText(provider, retry_delay=0)

        result = await stt.transcribe(b"audio", language="hi")

        assert result == "नमस्ते"
        assert provider.transcribe_calls[0][1] == "hi"


# ---------------------------------------------------------------------------
# TestTextToSpeech
# ---------------------------------------------------------------------------


class TestTextToSpeech:
    @pytest.mark.asyncio
    async def test_synthesize_returns_primary_audio(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(audio=b"mp3data")
        tts = TextToSpeech(primary)

        result = await tts.synthesize("hello")

        assert result == b"mp3data"

    @pytest.mark.asyncio
    async def test_synthesize_falls_back_on_empty_primary(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(audio=b"")
        fallback = _MockProvider(audio=b"fallback_audio")
        tts = TextToSpeech(primary, fallback=fallback)

        result = await tts.synthesize("hello")

        assert result == b"fallback_audio"

    @pytest.mark.asyncio
    async def test_synthesize_falls_back_on_exception(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(synthesis_error=ExternalServiceError("el", "fail"))
        fallback = _MockProvider(audio=b"backup_audio")
        tts = TextToSpeech(primary, fallback=fallback)

        result = await tts.synthesize("hello")

        assert result == b"backup_audio"

    @pytest.mark.asyncio
    async def test_synthesize_returns_empty_if_all_fail(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(synthesis_error=ExternalServiceError("el", "fail"))
        fallback = _MockProvider(synthesis_error=ExternalServiceError("oai", "fail"))
        tts = TextToSpeech(primary, fallback=fallback)

        result = await tts.synthesize("hello")

        assert result == b""

    @pytest.mark.asyncio
    async def test_synthesize_returns_empty_with_no_fallback(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(audio=b"")
        tts = TextToSpeech(primary)

        result = await tts.synthesize("hello")

        assert result == b""

    @pytest.mark.asyncio
    async def test_synthesize_stream_yields_chunks(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(stream_chunks=[b"a", b"b", b"c"])
        tts = TextToSpeech(primary)

        chunks = [c async for c in tts.synthesize_stream("hello")]

        assert chunks == [b"a", b"b", b"c"]

    @pytest.mark.asyncio
    async def test_synthesize_stream_falls_back_on_empty_primary(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(stream_chunks=[])
        fallback = _MockProvider(stream_chunks=[b"fb1", b"fb2"])
        tts = TextToSpeech(primary, fallback=fallback)

        chunks = [c async for c in tts.synthesize_stream("hello")]

        assert chunks == [b"fb1", b"fb2"]

    @pytest.mark.asyncio
    async def test_synthesize_stream_falls_back_on_exception(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(stream_error=ExternalServiceError("el", "stream fail"))
        fallback = _MockProvider(stream_chunks=[b"fb"])
        tts = TextToSpeech(primary, fallback=fallback)

        chunks = [c async for c in tts.synthesize_stream("hello")]

        assert chunks == [b"fb"]

    @pytest.mark.asyncio
    async def test_synthesize_stream_no_fallback_empty(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(stream_chunks=[])
        tts = TextToSpeech(primary)

        chunks = [c async for c in tts.synthesize_stream("hello")]

        assert chunks == []

    @pytest.mark.asyncio
    async def test_synthesize_stream_fallback_error_yields_nothing(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(stream_chunks=[])
        fallback = _MockProvider(stream_error=RuntimeError("fallback also fails"))
        tts = TextToSpeech(primary, fallback=fallback)

        chunks = [c async for c in tts.synthesize_stream("hello")]

        assert chunks == []

    @pytest.mark.asyncio
    async def test_synthesize_forwards_language_and_voice(self):
        from app.voice.tts import TextToSpeech

        primary = _MockProvider(audio=b"ok")
        tts = TextToSpeech(primary)

        await tts.synthesize("text", language="hi", voice="nova")

        assert primary.synthesize_calls[0] == ("text", "hi", "nova")


# ---------------------------------------------------------------------------
# TestVoiceManager
# ---------------------------------------------------------------------------


class TestVoiceManager:
    @pytest.mark.asyncio
    async def test_transcribe_delegates_to_stt(self):
        from app.voice.stt import SpeechToText
        from app.voice.tts import TextToSpeech
        from app.voice.voice_manager import VoiceManager

        mock_stt = MagicMock(spec=SpeechToText)
        mock_stt.transcribe = AsyncMock(return_value="hello")
        vm = VoiceManager(stt=mock_stt, tts=MagicMock(spec=TextToSpeech))

        result = await vm.transcribe(b"audio", "en")

        assert result == "hello"
        mock_stt.transcribe.assert_called_once_with(b"audio", language="en")

    @pytest.mark.asyncio
    async def test_transcribe_returns_empty_on_error(self):
        from app.voice.stt import SpeechToText
        from app.voice.tts import TextToSpeech
        from app.voice.voice_manager import VoiceManager

        mock_stt = MagicMock(spec=SpeechToText)
        mock_stt.transcribe = AsyncMock(side_effect=RuntimeError("stt fail"))
        vm = VoiceManager(stt=mock_stt, tts=MagicMock(spec=TextToSpeech))

        result = await vm.transcribe(b"audio")

        assert result == ""

    @pytest.mark.asyncio
    async def test_synthesize_delegates_to_tts(self):
        from app.voice.stt import SpeechToText
        from app.voice.tts import TextToSpeech
        from app.voice.voice_manager import VoiceManager

        mock_tts = MagicMock(spec=TextToSpeech)
        mock_tts.synthesize = AsyncMock(return_value=b"audio_bytes")
        vm = VoiceManager(stt=MagicMock(spec=SpeechToText), tts=mock_tts)

        result = await vm.synthesize("hello", "en")

        assert result == b"audio_bytes"
        mock_tts.synthesize.assert_called_once_with("hello", language="en")

    @pytest.mark.asyncio
    async def test_synthesize_returns_empty_on_error(self):
        from app.voice.stt import SpeechToText
        from app.voice.tts import TextToSpeech
        from app.voice.voice_manager import VoiceManager

        mock_tts = MagicMock(spec=TextToSpeech)
        mock_tts.synthesize = AsyncMock(side_effect=RuntimeError("tts fail"))
        vm = VoiceManager(stt=MagicMock(spec=SpeechToText), tts=mock_tts)

        result = await vm.synthesize("hello")

        assert result == b""

    @pytest.mark.asyncio
    async def test_synthesize_to_stream_yields_chunks(self):
        from app.voice.stt import SpeechToText
        from app.voice.tts import TextToSpeech
        from app.voice.voice_manager import VoiceManager

        async def _mock_stream(*args, **kwargs):
            yield b"a"
            yield b"b"

        mock_tts = MagicMock(spec=TextToSpeech)
        mock_tts.synthesize_stream = _mock_stream
        vm = VoiceManager(stt=MagicMock(spec=SpeechToText), tts=mock_tts)

        chunks = [c async for c in vm.synthesize_to_stream("hello")]

        assert chunks == [b"a", b"b"]

    @pytest.mark.asyncio
    async def test_synthesize_to_stream_handles_error(self):
        from app.voice.stt import SpeechToText
        from app.voice.tts import TextToSpeech
        from app.voice.voice_manager import VoiceManager

        mock_tts = MagicMock(spec=TextToSpeech)
        mock_tts.synthesize_stream = MagicMock(return_value=_ErrorStream(RuntimeError("fail")))
        vm = VoiceManager(stt=MagicMock(spec=SpeechToText), tts=mock_tts)

        chunks = [c async for c in vm.synthesize_to_stream("hello")]

        assert chunks == []


# ---------------------------------------------------------------------------
# TestAudioBuffer
# ---------------------------------------------------------------------------


class TestAudioBuffer:
    @pytest.mark.asyncio
    async def test_flush_called_on_drain(self):
        from app.voice.audio_stream import AudioBuffer

        received = []

        async def capture(data: bytes):
            received.append(data)

        buf = AudioBuffer(on_flush=capture, silence_ms=5000)
        await buf.push(b"hello")
        await buf.push(b" world")
        await buf.drain()

        assert len(received) == 1
        assert received[0] == b"hello world"

    @pytest.mark.asyncio
    async def test_max_bytes_triggers_flush(self):
        from app.voice.audio_stream import AudioBuffer

        received = []

        async def capture(data: bytes):
            received.append(data)

        buf = AudioBuffer(on_flush=capture, max_bytes=5, silence_ms=5000)
        await buf.push(b"123456")

        await asyncio.sleep(0.01)
        assert len(received) >= 1
        await buf.drain()

    @pytest.mark.asyncio
    async def test_empty_drain_does_nothing(self):
        from app.voice.audio_stream import AudioBuffer

        called = []

        async def capture(data: bytes):
            called.append(data)

        buf = AudioBuffer(on_flush=capture)
        await buf.drain()
        assert called == []


# ---------------------------------------------------------------------------
# TestExotelAudioStream (telephony integration — kept for regression)
# ---------------------------------------------------------------------------


class TestExotelAudioStream:
    @pytest.mark.asyncio
    async def test_parses_start_event(self):
        import json

        from app.telephony.exotel.stream import ExotelAudioStream

        ws = AsyncMock()
        received = []

        async def on_audio(data):
            received.append(data)

        stream = ExotelAudioStream(ws, on_audio=on_audio)

        start_msg = json.dumps(
            {
                "event": "start",
                "streamSid": "MZ123",
                "start": {"callSid": "CA456"},
            }
        )
        await stream._handle_message(start_msg)
        assert stream.stream_sid == "MZ123"
        assert stream.call_sid == "CA456"

    @pytest.mark.asyncio
    async def test_parses_media_event(self):
        import base64
        import json

        from app.telephony.exotel.stream import ExotelAudioStream

        ws = AsyncMock()
        received = []

        async def on_audio(data):
            received.append(data)

        stream = ExotelAudioStream(ws, on_audio=on_audio)
        payload = base64.b64encode(b"\x00\x01\x02").decode()
        media_msg = json.dumps({"event": "media", "media": {"payload": payload}})
        await stream._handle_message(media_msg)

        assert len(received) == 1
        assert received[0] == b"\x00\x01\x02"

    @pytest.mark.asyncio
    async def test_stop_event_sets_running_false(self):
        import json

        from app.telephony.exotel.stream import ExotelAudioStream

        ws = AsyncMock()
        stream = ExotelAudioStream(ws, on_audio=AsyncMock())
        stream._running = True
        stream._stream_sid = "MZ123"

        await stream._handle_message(json.dumps({"event": "stop"}))
        assert not stream._running
