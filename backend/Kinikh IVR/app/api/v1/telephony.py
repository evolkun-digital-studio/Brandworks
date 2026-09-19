"""Exotel webhook and audio stream endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request, WebSocket
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.core.exceptions import ValidationError
from app.services.call_service import CallService
from app.telephony.exotel.stream import ExotelAudioStream
from app.telephony.exotel.webhook import ExotelAdapter
from app.voice.speech_handler import SpeechHandler

router = APIRouter(prefix="/telephony", tags=["Telephony"])

_adapter: ExotelAdapter | None = None


def _get_adapter() -> ExotelAdapter:
    global _adapter
    if _adapter is None:
        _adapter = ExotelAdapter()
    return _adapter


@router.post("/incoming", summary="Exotel incoming call webhook")
async def incoming_call(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    form = await request.form()
    payload = dict(form)

    call_info = _get_adapter().parse_incoming_webhook(payload)
    if not call_info.call_sid:
        raise ValidationError("Missing required field: CallSid")
    logger.info(f"Incoming call sid={call_info.call_sid} from={call_info.caller_number}")

    call_service = CallService(db)
    await call_service.initiate(
        call_sid=call_info.call_sid,
        caller_number=call_info.caller_number,
        callee_number=call_info.callee_number,
    )

    settings_url = f"{request.base_url}api/v1/telephony/stream"
    return {
        "statusCode": 200,
        "message": "Call accepted",
        "streamUrl": settings_url,
    }


@router.post("/status", summary="Exotel call status webhook")
async def call_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    form = await request.form()
    payload = dict(form)

    call_info = _get_adapter().parse_status_webhook(payload)
    if not call_info.call_sid:
        raise ValidationError("Missing required field: CallSid")
    logger.info(f"Call status sid={call_info.call_sid} status={call_info.status}")

    call_service = CallService(db)
    if call_info.status in ("completed", "failed", "no-answer", "busy"):
        await call_service.complete(
            call_sid=call_info.call_sid,
            duration_seconds=call_info.duration,
            recording_url=call_info.recording_url,
        )
    else:
        await call_service.update_status(call_info.call_sid, call_info.status)

    return {"status": "ok"}


@router.websocket("/stream")
async def audio_stream(websocket: WebSocket, db: AsyncSession = Depends(get_db)) -> None:
    await websocket.accept()
    logger.info("WebSocket audio stream opened")

    speech_handler = SpeechHandler(db)
    speech_handler.set_websocket(websocket)

    stream = ExotelAudioStream(
        websocket=websocket,
        on_audio=speech_handler.handle_audio,
        on_dtmf=speech_handler.handle_dtmf,
        on_start=speech_handler._ensure_initialized,
    )

    try:
        await stream.start()
    except Exception as exc:
        logger.error(f"Audio stream error: {exc}")
    finally:
        await speech_handler.finalize(stream.call_sid)
        logger.info(f"Audio stream closed call={stream.call_sid}")
