"""Exotel webhook parser and signature verifier."""

from __future__ import annotations

import hashlib
import hmac
from typing import Any

from app.core.config import get_settings
from app.telephony.adapter import CallInfo, TelephonyAdapter
from app.telephony.exotel.client import ExotelClient


class ExotelAdapter(TelephonyAdapter):
    """Exotel implementation of TelephonyAdapter."""

    def __init__(self) -> None:
        self._client = ExotelClient()

    async def answer_call(self, call_sid: str) -> dict[str, Any]:
        return {"CallSid": call_sid, "action": "answered"}

    async def hangup_call(self, call_sid: str) -> None:
        await self._client.hangup(call_sid)

    async def send_digits(self, call_sid: str, digits: str) -> None:
        raise NotImplementedError("Exotel does not support mid-call DTMF injection via API")

    def parse_incoming_webhook(self, payload: dict[str, Any]) -> CallInfo:
        return CallInfo(
            call_sid=payload.get("CallSid", ""),
            caller_number=payload.get("From", ""),
            callee_number=payload.get("To"),
            status=payload.get("CallStatus", "initiated"),
            direction=payload.get("Direction", "inbound"),
            raw=payload,
        )

    def parse_status_webhook(self, payload: dict[str, Any]) -> CallInfo:
        return CallInfo(
            call_sid=payload.get("CallSid", ""),
            caller_number=payload.get("From", ""),
            callee_number=payload.get("To"),
            status=payload.get("CallStatus", "unknown"),
            direction=payload.get("Direction", "inbound"),
            duration=int(payload["CallDuration"]) if payload.get("CallDuration") else None,
            recording_url=payload.get("RecordingUrl"),
            raw=payload,
        )

    def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        secret = get_settings().exotel_webhook_secret.encode()
        expected = hmac.new(secret, payload, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
