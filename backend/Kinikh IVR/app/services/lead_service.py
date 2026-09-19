"""Lead capture and retrieval service."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead
from app.repositories.lead_repository import LeadRepository


class LeadService:
    def __init__(self, session: AsyncSession) -> None:
        self._repo = LeadRepository(session)

    async def create_from_call(
        self,
        phone: str,
        call_id: uuid.UUID | None = None,
        name: str | None = None,
        email: str | None = None,
        department_id: uuid.UUID | None = None,
        requirement: str | None = None,
        summary: str | None = None,
        language: str | None = None,
        additional_notes: str | None = None,
        raw_transcript: str | None = None,
    ) -> Lead:
        return await self._repo.create(
            phone=phone,
            call_id=call_id,
            name=name,
            email=email,
            department_id=department_id,
            requirement=requirement,
            summary=summary,
            language=language,
            additional_notes=additional_notes,
            raw_transcript=raw_transcript,
        )

    async def get(self, lead_id: uuid.UUID) -> Lead:
        return await self._repo.get_or_raise(lead_id)

    async def get_by_phone(self, phone: str) -> Lead | None:
        return await self._repo.get_by_phone(phone)

    async def get_by_call_id(self, call_id: uuid.UUID) -> Lead | None:
        return await self._repo.get_by_call_id(call_id)

    async def list(self, limit: int = 100, offset: int = 0) -> Sequence[Lead]:
        return await self._repo.list(limit=limit, offset=offset)

    async def list_by_department(self, department_id: uuid.UUID) -> Sequence[Lead]:
        return await self._repo.list_by_department(department_id)

    async def update(self, lead_id: uuid.UUID, **kwargs: Any) -> Lead:
        lead = await self._repo.get_or_raise(lead_id)
        return await self._repo.update(lead, **kwargs)
