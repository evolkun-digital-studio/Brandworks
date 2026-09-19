"""ApiUsage data access."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_usage import ApiUsage
from app.repositories.base import BaseRepository


class ApiUsageRepository(BaseRepository[ApiUsage]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(ApiUsage, session)

    async def list_by_call_sid(self, call_sid: str) -> Sequence[ApiUsage]:
        result = await self._session.execute(select(ApiUsage).where(ApiUsage.call_sid == call_sid))
        return result.scalars().all()
