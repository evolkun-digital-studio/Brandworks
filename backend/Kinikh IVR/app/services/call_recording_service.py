"""CallRecordingService — manages call recording metadata lifecycle."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call_recording import CallRecording
from app.repositories.call_recording_repository import CallRecordingRepository


class CallRecordingService:
    def __init__(self, db: AsyncSession) -> None:
        self._repo = CallRecordingRepository(db)

    async def start_recording(self, call_sid: str, caller_number: str) -> CallRecording:
        recording = await self._repo.create(
            call_sid=call_sid,
            caller_number=caller_number,
            start_time=datetime.now(UTC),
            status="recording",
        )
        logger.info(f"[recording] started call_sid={call_sid}")
        return recording

    async def complete_recording(
        self,
        call_sid: str,
        *,
        transcript: str | None = None,
        summary: str | None = None,
        department: str | None = None,
        language: str | None = None,
        lead_id: Any | None = None,
    ) -> CallRecording | None:
        recording = await self._repo.get_by_call_sid(call_sid)
        if not recording:
            logger.warning(f"[recording] not found for call_sid={call_sid}")
            return None

        end_time = datetime.now(UTC)
        duration = int((end_time - recording.start_time).total_seconds())
        kwargs: dict[str, Any] = {"end_time": end_time, "duration": duration, "status": "completed"}
        if transcript is not None:
            kwargs["transcript"] = transcript
        if summary is not None:
            kwargs["summary"] = summary
        if department is not None:
            kwargs["department"] = department
        if language is not None:
            kwargs["language"] = language
        if lead_id is not None:
            kwargs["lead_id"] = lead_id

        updated = await self._repo.update(recording, **kwargs)
        logger.info(f"[recording] completed call_sid={call_sid} duration={duration}s")
        return updated

    async def mark_failed(self, call_sid: str, error: str) -> None:
        recording = await self._repo.get_by_call_sid(call_sid)
        if recording:
            end_time = datetime.now(UTC)
            duration = int((end_time - recording.start_time).total_seconds())
            await self._repo.update(
                recording,
                status="failed",
                errors=error,
                end_time=end_time,
                duration=duration,
            )

    async def get(self, call_sid: str) -> CallRecording | None:
        return await self._repo.get_by_call_sid(call_sid)
