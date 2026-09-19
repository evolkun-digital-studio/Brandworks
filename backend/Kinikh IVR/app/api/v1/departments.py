"""Department management endpoints (protected)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user_id, get_db
from app.services.department_service import DepartmentService

router = APIRouter(prefix="/departments", tags=["Departments"])


class DepartmentCreate(BaseModel):
    name: str
    display_name: str
    email: EmailStr
    greeting: str | None = None
    prompt: str | None = None
    knowledge_base: str | None = None
    keywords: list[str] | None = None


class DepartmentResponse(BaseModel):
    id: uuid.UUID
    name: str
    display_name: str
    email: str
    greeting: str | None
    is_active: bool

    model_config = {"from_attributes": True}


@router.get("", response_model=list[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
) -> list[DepartmentResponse]:
    service = DepartmentService(db)
    depts = await service.list_active()
    return [DepartmentResponse.model_validate(d) for d in depts]


@router.post("", response_model=DepartmentResponse, status_code=201)
async def create_department(
    body: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
) -> DepartmentResponse:
    service = DepartmentService(db)
    dept = await service.create(**body.model_dump())
    return DepartmentResponse.model_validate(dept)


@router.patch("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: uuid.UUID,
    body: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
) -> DepartmentResponse:
    service = DepartmentService(db)
    dept = await service.update(department_id, **body.model_dump(exclude_unset=True))
    return DepartmentResponse.model_validate(dept)


@router.delete("/{department_id}", status_code=204)
async def deactivate_department(
    department_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
) -> None:
    service = DepartmentService(db)
    await service.deactivate(department_id)
