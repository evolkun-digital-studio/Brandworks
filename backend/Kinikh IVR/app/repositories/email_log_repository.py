"""EmailLog-specific data access operations."""

from __future__ import annotations

from collections.abc import Sequence
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_log import EmailLog
from app.repositories.base import BaseRepository


class EmailLogRepository(BaseRepository[EmailLog]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(EmailLog, session)

    async def list_by_lead(self, lead_id: uuid.UUID) -> Sequence[EmailLog]:
        result = await self._session.execute(
            select(EmailLog).where(EmailLog.lead_id == lead_id).order_by(EmailLog.created_at.desc())
        )
        return result.scalars().all()

    async def list_pending_retry(self, max_retries: int = 3) -> Sequence[EmailLog]:
        result = await self._session.execute(
            select(EmailLog)
            .where(EmailLog.status == "failed", EmailLog.retry_count < max_retries)
            .order_by(EmailLog.created_at)
        )
        return result.scalars().all()
