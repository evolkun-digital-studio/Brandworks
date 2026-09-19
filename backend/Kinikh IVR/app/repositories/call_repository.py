"""Call-specific data access operations."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call import Call
from app.repositories.base import BaseRepository


class CallRepository(BaseRepository[Call]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Call, session)

    async def get_by_sid(self, call_sid: str) -> Call | None:
        result = await self._session.execute(select(Call).where(Call.call_sid == call_sid))
        return result.scalar_one_or_none()

    async def list_by_caller(self, caller_number: str, limit: int = 50) -> Sequence[Call]:
        result = await self._session.execute(
            select(Call)
            .where(Call.caller_number == caller_number)
            .order_by(Call.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def list_by_status(self, status: str, limit: int = 100) -> Sequence[Call]:
        result = await self._session.execute(
            select(Call).where(Call.status == status).order_by(Call.created_at.desc()).limit(limit)
        )
        return result.scalars().all()
