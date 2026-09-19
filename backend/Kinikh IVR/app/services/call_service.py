"""Call lifecycle management service."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call import Call
from app.repositories.call_repository import CallRepository


class CallService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = CallRepository(session)

    async def initiate(
        self, call_sid: str, caller_number: str, callee_number: str | None = None
    ) -> Call:
        """Create the call record, or return the existing one if already registered.

        Exotel (and telephony providers generally) may redeliver the incoming-call
        webhook — this makes the operation idempotent instead of raising a DB
        UniqueViolation on the second delivery.
        """
        existing = await self._repo.get_by_sid(call_sid)
        if existing is not None:
            return existing
        return await self._repo.create(
            call_sid=call_sid,
            caller_number=caller_number,
            callee_number=callee_number,
            status="initiated",
            started_at=datetime.now(UTC),
        )

    async def get_by_sid(self, call_sid: str) -> Call | None:
        return await self._repo.get_by_sid(call_sid)

    async def get_by_sid_or_raise(self, call_sid: str) -> Call:
        from app.core.exceptions import NotFoundError

        call = await self._repo.get_by_sid(call_sid)
        if call is None:
            raise NotFoundError("Call", call_sid)
        return call

    async def update_status(
        self, call_sid: str, status: str, error_message: str | None = None
    ) -> Call:
        call = await self.get_by_sid_or_raise(call_sid)
        updates: dict = {"status": status}
        if error_message:
            updates["error_message"] = error_message
        return await self._repo.update(call, **updates)

    async def complete(
        self,
        call_sid: str,
        duration_seconds: int | None = None,
        transcript: str | None = None,
        recording_url: str | None = None,
    ) -> Call:
        call = await self.get_by_sid_or_raise(call_sid)
        return await self._repo.update(
            call,
            status="completed",
            ended_at=datetime.now(UTC),
            duration_seconds=duration_seconds,
            transcript=transcript,
            recording_url=recording_url,
        )
