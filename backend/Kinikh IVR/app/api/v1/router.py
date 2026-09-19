"""Aggregates all v1 API routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import auth, departments, health, leads, telephony

router = APIRouter(prefix="/api/v1")

router.include_router(health.router)
router.include_router(auth.router)
router.include_router(leads.router)
router.include_router(departments.router)
router.include_router(telephony.router)
