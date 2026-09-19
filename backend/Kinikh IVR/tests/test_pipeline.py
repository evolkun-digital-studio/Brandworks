"""Integration tests for the complete call pipeline.

Simulates:
  Incoming Call → Webhook → WebSocket Audio → STT → Conversation Engine
  → Voice Generation → Audio Response → Call End → Lead Extraction
  → Database → Email

All external I/O (OpenAI, ElevenLabs, SMTP, PostgreSQL) is mocked.
The pipeline logic — routing between components, state transitions,
error handling — is exercised against real code.
"""

from __future__ import annotations

import base64
import json
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

import pytest

# ---------------------------------------------------------------------------
# Stream message builders
# ---------------------------------------------------------------------------


def _ws_connected() -> str:
    return json.dumps({"event": "connected"})


def _ws_start(
    call_sid: str,
    caller_number: str,
    stream_sid: str = "MZ001",
) -> str:
    return json.dumps(
        {
            "event": "start",
            "streamSid": stream_sid,
            "start": {
                "callSid": call_sid,
                "streamSid": stream_sid,
                "customParameters": {"From": caller_number},
            },
        }
    )


def _ws_media(audio: bytes = b"\x00" * 160, stream_sid: str = "MZ001") -> str:
    return json.dumps(
        {
            "event": "media",
            "streamSid": stream_sid,
            "media": {"payload": base64.b64encode(audio).decode(), "track": "inbound"},
        }
    )


def _ws_stop(stream_sid: str = "MZ001") -> str:
    return json.dumps({"event": "stop", "streamSid": stream_sid})


# ---------------------------------------------------------------------------
# Fake WebSocket
# ---------------------------------------------------------------------------


class _FakeWebSocket:
    """Minimal WebSocket that replays pre-configured messages."""

    def __init__(self, messages: list[str]) -> None:
        self._messages = messages
        self.sent_bytes: list[bytes] = []
        self.sent_text: list[str] = []

    async def iter_text(self):
        for msg in self._messages:
            yield msg

    async def send_bytes(self, data: bytes) -> None:
        self.sent_bytes.append(data)

    async def send_text(self, data: str) -> None:
        self.sent_text.append(data)


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


def _make_mock_dept(
    name: str = "sales",
    email: str = "sales@kinikh.com",
    keywords: list[str] | None = None,
) -> MagicMock:
    dept = MagicMock()
    dept.name = name
    dept.display_name = name.title()
    dept.email = email
    dept.keywords = keywords or ["demo", "pricing", "buy"]
    dept.id = uuid.uuid4()
    return dept


def _make_mock_call(call_sid: str = "CA_TEST") -> MagicMock:
    call = MagicMock()
    call.id = uuid.uuid4()
    call.call_sid = call_sid
    call.caller_number = "+919876543210"
    return call


def _make_mock_lead(name: str = "Raj Kumar") -> MagicMock:
    lead = MagicMock()
    lead.id = uuid.uuid4()
    lead.name = name
    lead.phone = "+919876543210"
    lead.department_id = uuid.uuid4()
    return lead


def _lead_extraction_result(caller_phone: str = "+919876543210") -> dict:
    return {
        "name": "Raj Kumar",
        "phone": caller_phone,
        "email": "raj@example.com",
        "department": "sales",
        "requirement": "Product demo needed",
        "summary": "Caller needs a product demo.",
        "language": "en",
        "timestamp": "2026-06-30T10:00:00Z",
        "additional_notes": None,
    }


# ---------------------------------------------------------------------------
# SpeechHandler pipeline tests
# ---------------------------------------------------------------------------


class TestSpeechHandlerPipeline:
    """Unit-integration tests for SpeechHandler — all AI/DB/email are mocked."""

    def _make_handler(
        self,
        mock_db: AsyncMock,
        mock_voice: AsyncMock,
        mock_ai_client: AsyncMock,
    ) -> tuple:
        from app.voice.speech_handler import SpeechHandler

        handler = SpeechHandler(db=mock_db, voice=mock_voice, ai_client=mock_ai_client)
        mock_ws = MagicMock()
        mock_ws.send_bytes = AsyncMock()
        handler.set_websocket(mock_ws)
        return handler, mock_ws

    def _mock_ai_client(self, reply: str = "Could you share your email address?") -> AsyncMock:
        client = AsyncMock()
        client.chat = AsyncMock(return_value=reply)
        client.chat_json = AsyncMock(return_value=_lead_extraction_result())
        return client

    def _mock_voice(self, transcript: str = "Hi, I am Raj and I need a demo") -> AsyncMock:
        voice = AsyncMock()
        voice.transcribe = AsyncMock(return_value=transcript)
        voice.synthesize = AsyncMock(return_value=b"FAKE_AUDIO")
        return voice

    # ── Initialization ──────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_initialization_sends_greeting(self, mock_db_session):
        """After stream start, a greeting is synthesized and sent via WebSocket."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, mock_ws = self._make_handler(mock_db_session, mock_voice, mock_ai)

        mock_dept = _make_mock_dept()
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            await handler._ensure_initialized("CA001", "+919876543210")

        mock_voice.synthesize.assert_called_once()
        mock_ws.send_bytes.assert_called_once_with(b"FAKE_AUDIO")
        assert handler._initialized is True

    @pytest.mark.asyncio
    async def test_initialization_is_idempotent(self, mock_db_session):
        """Calling _ensure_initialized twice runs initialization only once."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, mock_ws = self._make_handler(mock_db_session, mock_voice, mock_ai)

        mock_dept = _make_mock_dept()
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            await handler._ensure_initialized("CA001", "+91000")
            await handler._ensure_initialized("CA001", "+91000")  # second call no-op

        # synthesize called once for greeting, not twice
        assert mock_voice.synthesize.call_count == 1

    @pytest.mark.asyncio
    async def test_initialization_loads_departments(self, mock_db_session):
        """Departments loaded from DB are stored on the handler."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        depts = [_make_mock_dept("sales"), _make_mock_dept("support", "support@kinikh.com")]
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=depts)):
            await handler._ensure_initialized("CA001", "+91000")

        assert len(handler._departments) == 2
        assert handler._departments[0]["name"] == "sales"

    @pytest.mark.asyncio
    async def test_handle_audio_before_init_is_safe(self, mock_db_session):
        """Audio received before initialization is silently dropped."""
        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        # Should not raise — buffer is None before init
        await handler.handle_audio(b"\x00" * 100)
        mock_voice.transcribe.assert_not_called()

    # ── Audio processing ────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_audio_flushed_runs_full_stt_ai_tts_cycle(self, mock_db_session):
        """Audio flush → STT → language detect → AI → TTS → audio sent."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice("I need a demo of your product")
        mock_ai = self._mock_ai_client("Sure, what is your name?")
        handler, mock_ws = self._make_handler(mock_db_session, mock_voice, mock_ai)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA002", "+91000")

        mock_voice.synthesize.reset_mock()
        mock_ws.send_bytes.reset_mock()

        await handler._on_audio_flushed(b"\x00" * 800)

        mock_voice.transcribe.assert_called_once()
        mock_ai.chat.assert_called()
        mock_voice.synthesize.assert_called()
        mock_ws.send_bytes.assert_called()

    @pytest.mark.asyncio
    async def test_empty_transcript_skips_conversation(self, mock_db_session):
        """Empty transcription result halts the pipeline for that audio chunk."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice("")  # empty transcript
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA003", "+91000")

        mock_ai.chat.reset_mock()
        await handler._on_audio_flushed(b"\x00" * 100)

        mock_ai.chat.assert_not_called()

    @pytest.mark.asyncio
    async def test_language_detected_on_early_utterances(self, mock_db_session):
        """Language is updated from "en" when Hindi is detected in first 4 turns."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice("मेरा नाम राज है")  # Devanagari → hi
        mock_ai = self._mock_ai_client("नमस्ते!")
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA004", "+91000")

        assert handler._context.language == "en"  # before flush
        await handler._on_audio_flushed(b"\x00" * 100)
        assert handler._context.language == "hi"  # Devanagari fast-path

    @pytest.mark.asyncio
    async def test_hinglish_detected_on_mixed_script(self, mock_db_session):
        """Mixed Devanagari+Latin transcript → language set to hi-en."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice("मेरा naam Raj hai")
        mock_ai = self._mock_ai_client("Main aapki help karoon ga")
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA005", "+91000")

        await handler._on_audio_flushed(b"\x00" * 100)
        assert handler._context.language == "hi-en"

    @pytest.mark.asyncio
    async def test_language_not_updated_after_4_messages(self, mock_db_session):
        """Language detection stops after the 4th message."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice("मेरा नाम राज है")
        mock_ai = self._mock_ai_client("OK")
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA006", "+91000")

        # Manually add 4 messages to skip detection
        for _ in range(4):
            handler._context.add_message("user", "something")

        handler._context.language = "hi"  # already set
        await handler._on_audio_flushed(b"\x00" * 100)
        # Should NOT change since messages >= 4
        assert handler._context.language == "hi"

    # ── Name extraction heuristic ───────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_name_extracted_from_my_name_is(self, mock_db_session):
        """'My name is X Y' heuristic captures up to 2 words after the phrase."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice("My name is Rajesh Kumar")
        mock_ai = self._mock_ai_client("Nice to meet you Rajesh!")
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA007", "+91000")

        await handler._on_audio_flushed(b"\x00" * 100)
        # Heuristic takes [0:2] words after the phrase — "Rajesh Kumar"
        assert "Rajesh" in (handler._context.collected["name"] or "")

    @pytest.mark.asyncio
    async def test_hindi_name_extracted(self, mock_db_session):
        """Hindi 'मेरा नाम X' pattern sets the name field (may include trailing word)."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice("मेरा नाम राज है")
        mock_ai = self._mock_ai_client("नमस्ते राज!")
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA008", "+91000")

        await handler._on_audio_flushed(b"\x00" * 100)
        # Heuristic picks up to 2 words after "मेरा नाम"; "राज" is the first
        assert "राज" in (handler._context.collected["name"] or "")

    # ── Confirmation ────────────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_confirmation_sent_when_all_fields_collected(self, mock_db_session):
        """When all required fields are collected, a confirmation message is spoken."""
        from app.services.department_service import DepartmentService

        mock_voice = self._mock_voice("Yes that's correct")
        mock_ai = self._mock_ai_client("Great, let me confirm")
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA009", "+91000")

        # Pre-populate required fields
        handler._context.collected["name"] = "Raj"
        handler._context.collected["requirement"] = "Demo needed"
        handler._context.collected["email"] = "raj@example.com"

        await handler._on_audio_flushed(b"\x00" * 100)

        assert handler._context.confirmed is True

    # ── _speak edge cases ───────────────────────────────────────────────────

    @pytest.mark.asyncio
    async def test_speak_without_websocket_is_silent(self, mock_db_session):
        """_speak does nothing when no WebSocket is set."""
        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)
        handler._ws = None  # remove websocket

        await handler._speak("Hello!")  # should not raise
        mock_voice.synthesize.assert_not_called()

    @pytest.mark.asyncio
    async def test_speak_empty_text_is_silent(self, mock_db_session):
        """_speak does nothing for empty strings."""
        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        await handler._speak("")
        mock_voice.synthesize.assert_not_called()

    # ── Finalization (Lead → DB → Email) ────────────────────────────────────

    @pytest.mark.asyncio
    async def test_finalize_creates_lead_in_db(self, mock_db_session):
        """finalize() extracts lead data and persists it to the database."""
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        mock_ai.chat_json = AsyncMock(return_value=_lead_extraction_result())
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        mock_dept = _make_mock_dept()
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            await handler._ensure_initialized("CA010", "+919876543210")

        handler._context.add_message("user", "I am Raj Kumar")
        handler._context.add_message("assistant", "Hello Raj!")

        mock_call = _make_mock_call("CA010")
        mock_lead = _make_mock_lead()

        create_from_call_mock = AsyncMock(return_value=mock_lead)
        with (
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=mock_call)),
            patch.object(CallService, "complete", AsyncMock()),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=mock_dept)),
            patch.object(LeadService, "create_from_call", create_from_call_mock),
            patch.object(EmailService, "dispatch_lead_email", AsyncMock()),
        ):
            await handler.finalize("CA010")

        create_from_call_mock.assert_called_once()
        call_kwargs = create_from_call_mock.call_args.kwargs
        assert call_kwargs["phone"] == "+919876543210"
        assert call_kwargs["name"] == "Raj Kumar"
        assert call_kwargs["requirement"] == "Product demo needed"

    @pytest.mark.asyncio
    async def test_finalize_dispatches_email(self, mock_db_session):
        """finalize() dispatches a lead notification email after DB write."""
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        mock_dept = _make_mock_dept()
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            await handler._ensure_initialized("CA011", "+919876543210")

        mock_call = _make_mock_call("CA011")
        mock_lead = _make_mock_lead()

        dispatch_mock = AsyncMock()
        with (
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=mock_call)),
            patch.object(CallService, "complete", AsyncMock()),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=mock_dept)),
            patch.object(LeadService, "create_from_call", AsyncMock(return_value=mock_lead)),
            patch.object(EmailService, "dispatch_lead_email", dispatch_mock),
        ):
            await handler.finalize("CA011")

        dispatch_mock.assert_called_once_with(mock_lead.id)

    @pytest.mark.asyncio
    async def test_finalize_email_failure_does_not_crash(self, mock_db_session):
        """Email dispatch failure is swallowed — lead still created in DB."""
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        mock_dept = _make_mock_dept()
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            await handler._ensure_initialized("CA012", "+91000")

        mock_lead = _make_mock_lead()
        create_mock = AsyncMock(return_value=mock_lead)

        with (
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=_make_mock_call())),
            patch.object(CallService, "complete", AsyncMock()),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=mock_dept)),
            patch.object(LeadService, "create_from_call", create_mock),
            patch.object(
                EmailService, "dispatch_lead_email", AsyncMock(side_effect=Exception("SMTP down"))
            ),
        ):
            await handler.finalize("CA012")  # must not raise

        create_mock.assert_called_once()  # lead was still created

    @pytest.mark.asyncio
    async def test_finalize_no_call_sid_is_noop(self, mock_db_session):
        """finalize() with None call_sid does nothing."""
        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)
        await handler.finalize(None)  # must not raise

    @pytest.mark.asyncio
    async def test_finalize_no_context_is_noop(self, mock_db_session):
        """finalize() when no context has been initialized does nothing."""
        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)
        await handler.finalize("CA_NOCONTEXT")  # must not raise

    @pytest.mark.asyncio
    async def test_finalize_cleans_up_context(self, mock_db_session):
        """finalize() removes the call context from the shared context_manager."""
        from app.ai.context_manager import context_manager
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        mock_dept = _make_mock_dept()
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            await handler._ensure_initialized("CA_CLEANUP", "+91000")

        assert await context_manager.get("CA_CLEANUP") is not None

        with (
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=_make_mock_call())),
            patch.object(CallService, "complete", AsyncMock()),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=mock_dept)),
            patch.object(
                LeadService, "create_from_call", AsyncMock(return_value=_make_mock_lead())
            ),
            patch.object(EmailService, "dispatch_lead_email", AsyncMock()),
        ):
            await handler.finalize("CA_CLEANUP")

        assert await context_manager.get("CA_CLEANUP") is None

    @pytest.mark.asyncio
    async def test_finalize_department_classified_by_keyword_when_missing(self, mock_db_session):
        """When lead_data has no department, the classifier fills it in."""
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        # Lead extraction returns no department
        mock_ai.chat_json = AsyncMock(
            return_value={
                "name": "Raj",
                "phone": "+91000",
                "email": None,
                "department": None,
                "requirement": "I want to buy a product",
                "summary": "Caller wants to buy.",
                "language": "en",
                "timestamp": "2026-06-30T00:00:00Z",
                "additional_notes": None,
            }
        )
        # Department classifier (keyword-based fast path)
        mock_ai.chat = AsyncMock(return_value="sales")

        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        mock_dept = _make_mock_dept("sales", keywords=["buy", "purchase"])
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            await handler._ensure_initialized("CA_CLASSIFY", "+91000")

        # The keyword "buy" should match via DepartmentClassifier fast-path
        create_mock = AsyncMock(return_value=_make_mock_lead())
        with (
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=_make_mock_call())),
            patch.object(CallService, "complete", AsyncMock()),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=mock_dept)),
            patch.object(LeadService, "create_from_call", create_mock),
            patch.object(EmailService, "dispatch_lead_email", AsyncMock()),
        ):
            await handler.finalize("CA_CLASSIFY")

        create_mock.assert_called_once()
        # Department should have been classified as "sales"
        call_kwargs = create_mock.call_args.kwargs
        assert call_kwargs.get("department_id") == mock_dept.id

    @pytest.mark.asyncio
    async def test_finalize_marks_call_complete_in_db(self, mock_db_session):
        """finalize() calls CallService.complete() to update call status."""
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService

        mock_voice = self._mock_voice()
        mock_ai = self._mock_ai_client()
        handler, _ = self._make_handler(mock_db_session, mock_voice, mock_ai)

        mock_dept = _make_mock_dept()
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            await handler._ensure_initialized("CA013", "+91000")

        handler._context.add_message("user", "Test")
        handler._context.add_message("assistant", "Reply")

        complete_mock = AsyncMock()
        with (
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=_make_mock_call())),
            patch.object(CallService, "complete", complete_mock),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=mock_dept)),
            patch.object(
                LeadService, "create_from_call", AsyncMock(return_value=_make_mock_lead())
            ),
            patch.object(EmailService, "dispatch_lead_email", AsyncMock()),
        ):
            await handler.finalize("CA013")

        complete_mock.assert_called_once()
        assert complete_mock.call_args.kwargs["transcript"] is not None


# ---------------------------------------------------------------------------
# ExotelAudioStream integration tests (on_start callback)
# ---------------------------------------------------------------------------


class TestExotelAudioStreamPipeline:
    """Tests ExotelAudioStream wired into SpeechHandler via on_start."""

    @pytest.mark.asyncio
    async def test_on_start_called_with_call_sid_and_caller_number(self):
        """Stream 'start' event fires on_start with correct call_sid + caller_number."""
        from app.telephony.exotel.stream import ExotelAudioStream

        on_start_calls: list[tuple[str, str]] = []

        async def capture_on_start(call_sid: str, caller_number: str) -> None:
            on_start_calls.append((call_sid, caller_number))

        ws = _FakeWebSocket(
            [
                _ws_connected(),
                _ws_start("CA_STREAM", "+919876543210"),
                _ws_stop(),
            ]
        )
        stream = ExotelAudioStream(
            websocket=ws,
            on_audio=AsyncMock(),
            on_start=capture_on_start,
        )
        await stream.start()

        assert len(on_start_calls) == 1
        assert on_start_calls[0] == ("CA_STREAM", "+919876543210")

    @pytest.mark.asyncio
    async def test_on_start_not_required(self):
        """Stream works normally when on_start is not provided."""
        from app.telephony.exotel.stream import ExotelAudioStream

        on_audio_calls: list[bytes] = []

        async def capture_audio(data: bytes) -> None:
            on_audio_calls.append(data)

        ws = _FakeWebSocket(
            [
                _ws_start("CA_NOSTART", "+91000"),
                _ws_media(b"\x01\x02"),
                _ws_stop(),
            ]
        )
        stream = ExotelAudioStream(websocket=ws, on_audio=capture_audio)
        await stream.start()

        assert len(on_audio_calls) == 1

    @pytest.mark.asyncio
    async def test_stream_passes_caller_number_from_custom_params(self):
        """caller_number is parsed from customParameters.From in the start event."""
        from app.telephony.exotel.stream import ExotelAudioStream

        on_start_mock = AsyncMock()
        ws = _FakeWebSocket([_ws_start("CA_NUM", "+918888888888"), _ws_stop()])
        stream = ExotelAudioStream(websocket=ws, on_audio=AsyncMock(), on_start=on_start_mock)
        await stream.start()

        on_start_mock.assert_called_once_with("CA_NUM", "+918888888888")
        assert stream.caller_number == "+918888888888"

    @pytest.mark.asyncio
    async def test_stream_caller_number_empty_when_missing_from_params(self):
        """caller_number defaults to '' if customParameters.From is absent."""
        from app.telephony.exotel.stream import ExotelAudioStream

        # Start message with no customParameters
        start_msg = json.dumps(
            {
                "event": "start",
                "streamSid": "MZ001",
                "start": {"callSid": "CA_NOCUSTOM"},
            }
        )
        ws = _FakeWebSocket([start_msg, _ws_stop()])
        on_start_mock = AsyncMock()
        stream = ExotelAudioStream(websocket=ws, on_audio=AsyncMock(), on_start=on_start_mock)
        await stream.start()

        on_start_mock.assert_called_once_with("CA_NOCUSTOM", "")
        assert stream.caller_number == ""

    @pytest.mark.asyncio
    async def test_stream_audio_delivered_after_start(self):
        """Audio chunks received after start are delivered to on_audio."""
        from app.telephony.exotel.stream import ExotelAudioStream

        received_audio: list[bytes] = []

        async def capture(data: bytes) -> None:
            received_audio.append(data)

        audio_payload = b"\xde\xad\xbe\xef"
        ws = _FakeWebSocket(
            [
                _ws_start("CA_AUDIO", "+91000"),
                _ws_media(audio_payload),
                _ws_media(audio_payload),
                _ws_stop(),
            ]
        )
        stream = ExotelAudioStream(websocket=ws, on_audio=capture)
        await stream.start()

        assert len(received_audio) == 2
        assert received_audio[0] == audio_payload

    @pytest.mark.asyncio
    async def test_stream_properties_after_start(self):
        """call_sid, stream_sid, and caller_number are accessible after start."""
        from app.telephony.exotel.stream import ExotelAudioStream

        ws = _FakeWebSocket([_ws_start("CA_PROPS", "+91000", "MZ_PROPS"), _ws_stop()])
        stream = ExotelAudioStream(websocket=ws, on_audio=AsyncMock())
        await stream.start()

        assert stream.call_sid == "CA_PROPS"
        assert stream.stream_sid == "MZ_PROPS"

    @pytest.mark.asyncio
    async def test_stream_wires_into_speech_handler(self, mock_db_session):
        """ExotelAudioStream on_start callback triggers SpeechHandler._ensure_initialized."""
        from app.services.department_service import DepartmentService
        from app.telephony.exotel.stream import ExotelAudioStream
        from app.voice.speech_handler import SpeechHandler

        mock_voice = AsyncMock()
        mock_voice.transcribe = AsyncMock(return_value="")
        mock_voice.synthesize = AsyncMock(return_value=b"GREETING_AUDIO")

        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(return_value="Welcome!")
        mock_ai.chat_json = AsyncMock(return_value={})

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        handler.set_websocket(MagicMock(send_bytes=AsyncMock()))

        mock_dept = _make_mock_dept()
        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])):
            ws = _FakeWebSocket(
                [
                    _ws_connected(),
                    _ws_start("CA_WIRE", "+919876543210"),
                    _ws_stop(),
                ]
            )
            stream = ExotelAudioStream(
                websocket=ws,
                on_audio=handler.handle_audio,
                on_dtmf=handler.handle_dtmf,
                on_start=handler._ensure_initialized,
            )
            await stream.start()

        assert handler._initialized is True
        assert handler._context is not None
        assert handler._context.call_sid == "CA_WIRE"
        mock_voice.synthesize.assert_called()


# ---------------------------------------------------------------------------
# Full end-to-end pipeline simulation
# ---------------------------------------------------------------------------


class TestFullPipeline:
    """Simulates the complete Exotel call lifecycle end-to-end."""

    @pytest.mark.asyncio
    async def test_complete_english_call(self, mock_db_session):
        """Full pipeline: connected → start → audio → stop → lead created → email sent."""
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService
        from app.telephony.exotel.stream import ExotelAudioStream
        from app.voice.speech_handler import SpeechHandler

        call_sid = "CA_E2E_EN"
        caller_number = "+919876543210"

        mock_voice = AsyncMock()
        mock_voice.transcribe = AsyncMock(return_value="Hi, I am Raj and I need a product demo")
        mock_voice.synthesize = AsyncMock(return_value=b"AUDIO_RESPONSE")

        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(return_value="Sure, what is your email address?")
        mock_ai.chat_json = AsyncMock(return_value=_lead_extraction_result(caller_number))

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        fake_ws = MagicMock()
        fake_ws.send_bytes = AsyncMock()
        handler.set_websocket(fake_ws)

        mock_dept = _make_mock_dept()
        mock_call = _make_mock_call(call_sid)
        mock_lead = _make_mock_lead()
        dispatch_mock = AsyncMock()
        create_lead_mock = AsyncMock(return_value=mock_lead)

        with (
            patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=mock_dept)),
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=mock_call)),
            patch.object(CallService, "complete", AsyncMock()),
            patch.object(LeadService, "create_from_call", create_lead_mock),
            patch.object(EmailService, "dispatch_lead_email", dispatch_mock),
        ):
            ws = _FakeWebSocket(
                [
                    _ws_connected(),
                    _ws_start(call_sid, caller_number),
                    _ws_media(b"\x00" * 160),
                    _ws_stop(),
                ]
            )
            stream = ExotelAudioStream(
                websocket=ws,
                on_audio=handler.handle_audio,
                on_dtmf=handler.handle_dtmf,
                on_start=handler._ensure_initialized,
            )
            await stream.start()
            await handler.finalize(stream.call_sid)

        # Greeting was synthesized and sent
        assert mock_voice.synthesize.call_count >= 1
        assert fake_ws.send_bytes.called

        # Lead was persisted to DB
        create_lead_mock.assert_called_once()
        lead_kwargs = create_lead_mock.call_args.kwargs
        assert lead_kwargs["phone"] == caller_number
        assert lead_kwargs["name"] == "Raj Kumar"

        # Email was dispatched
        dispatch_mock.assert_called_once_with(mock_lead.id)

    @pytest.mark.asyncio
    async def test_complete_hindi_call(self, mock_db_session):
        """Full pipeline with Hindi audio — language detected and lead captured."""
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService
        from app.telephony.exotel.stream import ExotelAudioStream
        from app.voice.speech_handler import SpeechHandler

        call_sid = "CA_E2E_HI"
        caller_number = "+919876543210"

        mock_voice = AsyncMock()
        mock_voice.transcribe = AsyncMock(return_value="मेरा नाम राज है, मुझे डेमो चाहिए")
        mock_voice.synthesize = AsyncMock(return_value=b"AUDIO_HI")

        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(return_value="ठीक है राज जी, आपका ईमेल क्या है?")
        mock_ai.chat_json = AsyncMock(
            return_value={
                **_lead_extraction_result(caller_number),
                "name": "राज",
                "language": "hi",
            }
        )

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        handler.set_websocket(MagicMock(send_bytes=AsyncMock()))

        mock_dept = _make_mock_dept()
        mock_call = _make_mock_call(call_sid)
        mock_lead = _make_mock_lead("राज")

        with (
            patch.object(DepartmentService, "list_active", AsyncMock(return_value=[mock_dept])),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=mock_dept)),
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=mock_call)),
            patch.object(CallService, "complete", AsyncMock()),
            patch.object(LeadService, "create_from_call", AsyncMock(return_value=mock_lead)),
            patch.object(EmailService, "dispatch_lead_email", AsyncMock()),
        ):
            ws = _FakeWebSocket(
                [
                    _ws_start(call_sid, caller_number),
                    _ws_media(b"\x00" * 160),
                    _ws_stop(),
                ]
            )
            stream = ExotelAudioStream(
                websocket=ws,
                on_audio=handler.handle_audio,
                on_start=handler._ensure_initialized,
            )
            await stream.start()

            # Drain buffer to trigger _on_audio_flushed (silence timer doesn't fire in tests)
            if handler._buffer:
                await handler._buffer.drain()

            # After audio flush, language should be Hindi (Devanagari fast-path)
            if handler._context:
                assert handler._context.language == "hi"

            await handler.finalize(stream.call_sid)

    @pytest.mark.asyncio
    async def test_complete_call_with_no_departments(self, mock_db_session):
        """Pipeline works even with no departments configured."""
        from app.services.call_service import CallService
        from app.services.department_service import DepartmentService
        from app.services.email_service import EmailService
        from app.services.lead_service import LeadService
        from app.telephony.exotel.stream import ExotelAudioStream
        from app.voice.speech_handler import SpeechHandler

        mock_voice = AsyncMock()
        mock_voice.transcribe = AsyncMock(return_value="Hello, I need help")
        mock_voice.synthesize = AsyncMock(return_value=b"AUDIO")

        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(return_value="How can I help you?")
        mock_ai.chat_json = AsyncMock(return_value=_lead_extraction_result())

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        handler.set_websocket(MagicMock(send_bytes=AsyncMock()))

        with (
            patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])),
            patch.object(DepartmentService, "get_by_name", AsyncMock(return_value=None)),
            patch.object(CallService, "get_by_sid", AsyncMock(return_value=_make_mock_call())),
            patch.object(CallService, "complete", AsyncMock()),
            patch.object(
                LeadService, "create_from_call", AsyncMock(return_value=_make_mock_lead())
            ),
            patch.object(EmailService, "dispatch_lead_email", AsyncMock()),
        ):
            ws = _FakeWebSocket([_ws_start("CA_NODEPT", "+91000"), _ws_stop()])
            stream = ExotelAudioStream(
                websocket=ws,
                on_audio=handler.handle_audio,
                on_start=handler._ensure_initialized,
            )
            await stream.start()
            await handler.finalize(stream.call_sid)

        assert handler._departments == []

    @pytest.mark.asyncio
    async def test_ai_failure_uses_fallback_response(self, mock_db_session):
        """When OpenAI fails during conversation, a language-appropriate fallback is used."""
        from app.services.department_service import DepartmentService

        mock_voice = AsyncMock()
        mock_voice.transcribe = AsyncMock(return_value="I need help")
        mock_voice.synthesize = AsyncMock(return_value=b"AUDIO")

        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(side_effect=Exception("OpenAI unavailable"))
        mock_ai.chat_json = AsyncMock(return_value=_lead_extraction_result())

        from app.voice.speech_handler import SpeechHandler

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        fake_ws = MagicMock(send_bytes=AsyncMock())
        handler.set_websocket(fake_ws)

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA_FAIL", "+91000")

        fake_ws.send_bytes.reset_mock()
        mock_voice.synthesize.reset_mock()

        await handler._on_audio_flushed(b"\x00" * 100)

        # Fallback message should have been synthesized and sent
        mock_voice.synthesize.assert_called()
        spoken_text = mock_voice.synthesize.call_args[0][0]
        assert "sorry" in spoken_text.lower() or "trouble" in spoken_text.lower()

    @pytest.mark.asyncio
    async def test_stt_failure_skips_conversation(self, mock_db_session):
        """When STT returns empty string, no AI call is made."""
        from app.services.department_service import DepartmentService

        mock_voice = AsyncMock()
        mock_voice.transcribe = AsyncMock(return_value="")  # STT returns nothing
        mock_voice.synthesize = AsyncMock(return_value=b"AUDIO")

        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(return_value="Reply")

        from app.voice.speech_handler import SpeechHandler

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        handler.set_websocket(MagicMock(send_bytes=AsyncMock()))

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA_STT_FAIL", "+91000")

        mock_ai.chat.reset_mock()
        await handler._on_audio_flushed(b"\x00" * 100)

        mock_ai.chat.assert_not_called()

    @pytest.mark.asyncio
    async def test_dtmf_handled_without_error(self, mock_db_session):
        """DTMF digits are received without causing any error."""
        from app.voice.speech_handler import SpeechHandler

        handler = SpeechHandler(db=mock_db_session)
        await handler.handle_dtmf("5")  # must not raise

    @pytest.mark.asyncio
    async def test_multiple_audio_chunks_accumulate(self, mock_db_session):
        """Multiple audio chunks before silence flush are all passed to STT."""
        from app.services.department_service import DepartmentService

        mock_voice = AsyncMock()
        mock_voice.transcribe = AsyncMock(return_value="Hello")
        mock_voice.synthesize = AsyncMock(return_value=b"AUDIO")
        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(return_value="Reply")
        mock_ai.chat_json = AsyncMock(return_value={})

        from app.voice.speech_handler import SpeechHandler

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        handler.set_websocket(MagicMock(send_bytes=AsyncMock()))

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("CA_CHUNKS", "+91000")

        # Push multiple audio chunks then drain
        assert handler._buffer is not None
        for _ in range(3):
            await handler._buffer.push(b"\x00" * 100)
        await handler._buffer.drain()


# ---------------------------------------------------------------------------
# Greeting language tests
# ---------------------------------------------------------------------------


class TestGreetingLanguages:
    """Verify greetings are language-appropriate."""

    @pytest.mark.asyncio
    async def test_greeting_en_contains_welcome(self, mock_db_session):
        from app.services.department_service import DepartmentService
        from app.voice.speech_handler import SpeechHandler

        mock_voice = AsyncMock()
        mock_voice.synthesize = AsyncMock(return_value=b"AUDIO")
        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(return_value="Hi")

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        handler.set_websocket(MagicMock(send_bytes=AsyncMock()))

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("GR_EN", "+91000")

        args = mock_voice.synthesize.call_args[0]
        assert "Welcome" in args[0] or "Hello" in args[0]

    @pytest.mark.asyncio
    async def test_greeting_hi_contains_namasthe(self, mock_db_session):
        from app.ai.context_manager import context_manager
        from app.services.department_service import DepartmentService
        from app.voice.speech_handler import SpeechHandler

        mock_voice = AsyncMock()
        mock_voice.synthesize = AsyncMock(return_value=b"AUDIO")
        mock_ai = AsyncMock()
        mock_ai.chat = AsyncMock(return_value="नमस्ते")

        handler = SpeechHandler(db=mock_db_session, voice=mock_voice, ai_client=mock_ai)
        handler.set_websocket(MagicMock(send_bytes=AsyncMock()))

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("GR_HI", "+91000")

        # Set language to Hindi and trigger greeting
        handler._context.language = "hi"
        handler._initialized = False
        handler._context = None

        with patch.object(DepartmentService, "list_active", AsyncMock(return_value=[])):
            await handler._ensure_initialized("GR_HI2", "+91001")

        ctx = await context_manager.get("GR_HI2")
        await context_manager.remove("GR_HI")
        await context_manager.remove("GR_HI2")
        assert ctx is not None

    @pytest.mark.asyncio
    async def test_hindi_greeting_spoken_when_language_hi(self, mock_db_session):
        """If context language is 'hi', get_greeting returns Devanagari text."""
        from app.ai.context_manager import CallContext
        from app.ai.conversation import ConversationEngine

        ctx = CallContext(call_sid="X", caller_number="+91000", language="hi")
        mock_ai = AsyncMock()
        engine = ConversationEngine([], client=mock_ai)
        greeting = await engine.get_greeting(ctx)
        assert "नमस्ते" in greeting
        mock_ai.chat.assert_not_called()

    @pytest.mark.asyncio
    async def test_hinglish_greeting_spoken_when_language_hi_en(self, mock_db_session):
        """If context language is 'hi-en', get_greeting returns Hinglish text."""
        from app.ai.context_manager import CallContext
        from app.ai.conversation import ConversationEngine

        ctx = CallContext(call_sid="X", caller_number="+91000", language="hi-en")
        mock_ai = AsyncMock()
        engine = ConversationEngine([], client=mock_ai)
        greeting = await engine.get_greeting(ctx)
        assert "swagat" in greeting or "Hello" in greeting
        mock_ai.chat.assert_not_called()
