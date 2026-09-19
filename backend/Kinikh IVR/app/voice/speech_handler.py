"""SpeechHandler — orchestrates STT → AI conversation → TTS for each call."""

from __future__ import annotations

from typing import Any

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.context_manager import CallContext, context_manager
from app.ai.conversation import ConversationEngine
from app.ai.department_classifier import DepartmentClassifier
from app.ai.language_detector import LanguageDetector
from app.ai.lead_extractor import LeadExtractor
from app.ai.openai_client import OpenAIClient
from app.ai.prompt_manager import PromptManager
from app.ai.summary_generator import SummaryGenerator
from app.core.config import get_settings
from app.services.call_service import CallService
from app.services.department_service import DepartmentService
from app.services.email_service import EmailService
from app.services.lead_service import LeadService
from app.voice.audio_stream import AudioBuffer
from app.voice.voice_manager import VoiceManager


class SpeechHandler:
    """
    Entry point for each call's audio pipeline.
    Receives audio bytes → transcribes → runs conversation → synthesizes reply.

    All external I/O components (VoiceManager, OpenAIClient) accept injection
    so the handler is fully testable without live API keys.
    """

    def __init__(
        self,
        db: AsyncSession,
        voice: VoiceManager | None = None,
        ai_client: OpenAIClient | None = None,
    ) -> None:
        self._db = db
        self._voice = voice or VoiceManager()
        self._language_detector = LanguageDetector(client=ai_client)
        self._lead_extractor = LeadExtractor(client=ai_client)
        self._summary_generator = SummaryGenerator(client=ai_client)
        self._prompt_manager = PromptManager()
        self._ai_client = ai_client
        self._settings = get_settings()
        self._context: CallContext | None = None
        self._ws: Any = None
        self._departments: list[dict[str, Any]] = []
        self._engine: ConversationEngine | None = None
        self._buffer: AudioBuffer | None = None
        self._initialized = False

    async def _ensure_initialized(self, call_sid: str, caller_number: str) -> None:
        """Lazy initialization triggered by the Exotel stream 'start' event.

        Loads department config from DB, creates the AI engine, generates
        and speaks the opening greeting.
        """
        if self._initialized:
            return
        dept_service = DepartmentService(self._db)
        raw_depts = await dept_service.list_active()
        self._departments = [
            {"name": d.name, "email": d.email, "keywords": d.keywords or []} for d in raw_depts
        ]
        self._engine = ConversationEngine(self._departments, client=self._ai_client)
        self._context = await context_manager.get_or_create(call_sid, caller_number)
        self._buffer = AudioBuffer(on_flush=self._on_audio_flushed)
        self._initialized = True

        greeting = await self._engine.get_greeting(self._context)
        await self._speak(greeting)

    async def handle_audio(self, audio_bytes: bytes) -> None:
        if self._buffer:
            await self._buffer.push(audio_bytes)

    async def handle_dtmf(self, digit: str) -> None:
        logger.info(f"DTMF received: {digit}")

    async def _on_audio_flushed(self, audio_bytes: bytes) -> None:
        if not self._context or not self._engine:
            return

        transcript = await self._voice.transcribe(audio_bytes, self._context.language)
        if not transcript:
            return

        # Detect language on first few utterances while still early in the call.
        if self._context.language == "en" and len(self._context.messages) < 4:
            self._context.language = await self._language_detector.detect(transcript)

        reply = await self._engine.get_next_response(self._context, transcript)

        # Attempt to extract fields from the latest exchange.
        await self._try_extract_fields(transcript)

        if self._context.all_required_collected() and not self._context.confirmed:
            reply = await self._build_confirmation()
            self._context.confirmed = True

        await self._speak(reply)

        if self._context.ended:
            farewell = self._prompt_manager.farewell(
                self._context.language, self._settings.company_name
            )
            await self._speak(farewell)

    async def _try_extract_fields(self, text: str) -> None:
        """Heuristic inline extraction — supplements the end-of-call full extraction."""
        ctx = self._context
        if not ctx:
            return
        lower = text.lower()
        if not ctx.collected["name"] and ("my name is" in lower or "मेरा नाम" in text):
            for phrase in ["my name is", "i am", "मेरा नाम"]:
                if phrase in lower or phrase in text:
                    after = text[text.lower().find(phrase) + len(phrase) :].strip().split()[0:2]
                    ctx.collected["name"] = " ".join(after).strip(".,")
                    break

    async def _build_confirmation(self) -> str:
        ctx = self._context
        return self._prompt_manager.confirmation(
            language=ctx.language,
            name=ctx.collected.get("name") or "N/A",
            phone=ctx.collected.get("phone") or "N/A",
            email=ctx.collected.get("email") or "N/A",
            department=ctx.collected.get("department") or "N/A",
            requirement=ctx.collected.get("requirement") or "N/A",
        )

    async def _speak(self, text: str) -> None:
        if not text or not self._ws:
            return
        lang = self._context.language if self._context else "en"
        audio = await self._voice.synthesize(text, lang)
        if audio and self._ws:
            try:
                await self._ws.send_bytes(audio)
            except Exception as exc:
                logger.warning(f"Failed to send audio: {exc}")

    def set_websocket(self, ws: Any) -> None:
        self._ws = ws

    async def finalize(self, call_sid: str | None) -> None:
        """Called when the call ends — extracts lead, persists to DB, and sends email."""
        if not call_sid or not self._context:
            return

        try:
            if self._buffer:
                await self._buffer.drain()

            transcript = self._context.transcript
            summary = await self._summary_generator.generate(transcript)
            lead_data = await self._lead_extractor.extract(transcript, self._context.caller_number)

            # Classify department if not already determined by the conversation.
            if not lead_data.get("department") and lead_data.get("requirement"):
                classifier = DepartmentClassifier(self._departments, client=self._ai_client)
                dept_name = await classifier.classify(lead_data["requirement"])
                lead_data["department"] = dept_name

            call_service = CallService(self._db)
            call = await call_service.get_by_sid(call_sid)

            dept_id = None
            if lead_data.get("department"):
                dept_service = DepartmentService(self._db)
                dept = await dept_service.get_by_name(lead_data["department"])
                if dept:
                    dept_id = dept.id

            lead_service = LeadService(self._db)
            lead = await lead_service.create_from_call(
                phone=lead_data["phone"],
                call_id=call.id if call else None,
                name=lead_data.get("name"),
                email=lead_data.get("email"),
                department_id=dept_id,
                requirement=lead_data.get("requirement"),
                summary=lead_data.get("summary") or summary,
                language=lead_data.get("language"),
                additional_notes=lead_data.get("additional_notes"),
                raw_transcript=transcript,
            )

            await call_service.complete(call_sid, transcript=transcript)

            # Dispatch lead notification email — failure is non-fatal.
            try:
                email_service = EmailService(self._db)
                await email_service.dispatch_lead_email(lead.id)
            except Exception as email_exc:
                logger.error(f"[pipeline] email dispatch failed lead={lead.id}: {email_exc}")

        except Exception as exc:
            logger.error(f"Call finalization error for {call_sid}: {exc}")
        finally:
            await context_manager.remove(call_sid)
