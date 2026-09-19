"""Lead-specific data access operations."""

from __future__ import annotations

from collections.abc import Sequence
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.repositories.base import BaseRepository


class LeadRepository(BaseRepository[Lead]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Lead, session)

    async def get_by_phone(self, phone: str) -> Lead | None:
        result = await self._session.execute(
            select(Lead).where(Lead.phone == phone).order_by(Lead.created_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_call_id(self, call_id: uuid.UUID) -> Lead | None:
        result = await self._session.execute(select(Lead).where(Lead.call_id == call_id))
        return result.scalar_one_or_none()

    async def list_by_department(
        self, department_id: uuid.UUID, limit: int = 100
    ) -> Sequence[Lead]:
        result = await self._session.execute(
            select(Lead)
            .where(Lead.department_id == department_id)
            .order_by(Lead.created_at.desc())
            .limit(limit)
        )
        return result.scalars().all()
