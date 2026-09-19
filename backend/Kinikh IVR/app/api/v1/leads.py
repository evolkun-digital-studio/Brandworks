"""Lead management endpoints (protected)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.services.lead_service import LeadService

router = APIRouter(prefix="/leads", tags=["Leads"])


class LeadResponse(BaseModel):
    id: uuid.UUID
    name: str | None
    phone: str
    email: str | None
    requirement: str | None
    summary: str | None
    language: str | None
    department_id: uuid.UUID | None

    model_config = {"from_attributes": True}


@router.get("", response_model=list[LeadResponse])
async def list_leads(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
) -> list[LeadResponse]:
    service = LeadService(db)
    leads = await service.list(limit=limit, offset=offset)
    return [LeadResponse.model_validate(row) for row in leads]


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
) -> LeadResponse:
    service = LeadService(db)
    lead = await service.get(lead_id)
    return LeadResponse.model_validate(lead)
