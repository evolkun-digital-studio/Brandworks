"""Email dispatch service — triggered after lead is created."""

from __future__ import annotations

from typing import Any
import uuid

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.email_system.email_sender import EmailSender
from app.repositories.department_repository import DepartmentRepository
from app.services.lead_service import LeadService


class EmailService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._sender = EmailSender(db)
        self._dept_repo = DepartmentRepository(db)
        self._lead_service = LeadService(db)

    async def dispatch_lead_email(self, lead_id: uuid.UUID) -> None:
        """Look up the lead, find its department email, and send the report."""
        lead = await self._lead_service.get(lead_id)

        recipient_emails = []
        if lead.department_id:
            dept = await self._dept_repo.get(lead.department_id)
            if dept and dept.email:
                recipient_emails.append(dept.email)

        if not recipient_emails:
            from app.core.config import get_settings

            # Fall back to company-level contact if no department email.
            settings = get_settings()
            if settings.smtp_from_email:
                recipient_emails.append(str(settings.smtp_from_email))

        lead_data: dict[str, Any] = {
            "name": lead.name,
            "phone": lead.phone,
            "email": lead.email,
            "department": lead.department.display_name if lead.department else "General",
            "requirement": lead.requirement,
            "summary": lead.summary,
            "language": lead.language,
            "additional_notes": lead.additional_notes,
        }

        try:
            await self._sender.send_lead_report(
                recipient_emails=recipient_emails,
                lead_data=lead_data,
                lead_id=lead.id,
            )
        except Exception as exc:
            logger.error(f"Lead email dispatch failed for {lead_id}: {exc}")
