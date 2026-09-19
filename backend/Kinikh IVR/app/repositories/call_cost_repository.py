"""CallCost data access."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.call_cost import CallCost
from app.repositories.base import BaseRepository


class CallCostRepository(BaseRepository[CallCost]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(CallCost, session)

    async def get_by_call_sid(self, call_sid: str) -> CallCost | None:
        result = await self._session.execute(select(CallCost).where(CallCost.call_sid == call_sid))
        return result.scalar_one_or_none()
