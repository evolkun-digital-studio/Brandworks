"""Async SMTP client using aiosmtplib-compatible pattern via asyncio executor."""

from __future__ import annotations

import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
import ssl

from loguru import logger

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceError


class SMTPClient:
    """Thread-pool-based SMTP client (smtplib wrapped in executor for async compatibility)."""

    def __init__(self) -> None:
        settings = get_settings()
        self._host = settings.smtp_host
        self._port = settings.smtp_port
        self._username = settings.smtp_username
        self._password = settings.smtp_password
        self._from_email = str(settings.smtp_from_email)
        self._from_name = settings.smtp_from_name
        self._use_tls = settings.smtp_use_tls

    def _send_sync(
        self, to: list[str], subject: str, html_body: str, text_body: str | None
    ) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self._from_name} <{self._from_email}>"
        msg["To"] = ", ".join(to)

        if text_body:
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        context = ssl.create_default_context()
        with smtplib.SMTP(self._host, self._port) as server:
            server.ehlo()
            if self._use_tls:
                server.starttls(context=context)
                server.ehlo()
            server.login(self._username, self._password)
            server.sendmail(self._from_email, to, msg.as_string())

    async def send(
        self,
        to: list[str],
        subject: str,
        html_body: str,
        text_body: str | None = None,
    ) -> None:
        loop = asyncio.get_running_loop()
        try:
            await loop.run_in_executor(None, self._send_sync, to, subject, html_body, text_body)
            logger.info(f"Email sent to {to} subject='{subject}'")
        except Exception as exc:
            logger.error(f"SMTP send failed: {exc}")
            raise ExternalServiceError("SMTP", str(exc)) from exc
