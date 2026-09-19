"""Exotel audio stream handler — bridges Exotel WS stream to the AI pipeline."""

from __future__ import annotations

import base64
from collections.abc import Callable, Coroutine
import json
from typing import Any

from loguru import logger


class ExotelAudioStream:
    """Receives μ-law audio from Exotel WebSocket and feeds it to consumer callbacks.

    Lifecycle callbacks:
    - on_start(call_sid, caller_number) — fired once when stream begins
    - on_audio(bytes)                   — fired for each media chunk
    - on_dtmf(digit)                    — fired for each DTMF keypress
    """

    def __init__(
        self,
        websocket: Any,
        on_audio: Callable[[bytes], Coroutine[Any, Any, None]],
        on_dtmf: Callable[[str], Coroutine[Any, Any, None]] | None = None,
        on_start: Callable[[str, str], Coroutine[Any, Any, None]] | None = None,
    ) -> None:
        self._ws = websocket
        self._on_audio = on_audio
        self._on_dtmf = on_dtmf
        self._on_start = on_start
        self._stream_sid: str | None = None
        self._call_sid: str | None = None
        self._caller_number: str = ""
        self._running = False

    @property
    def call_sid(self) -> str | None:
        return self._call_sid

    @property
    def stream_sid(self) -> str | None:
        return self._stream_sid

    @property
    def caller_number(self) -> str:
        return self._caller_number

    async def start(self) -> None:
        self._running = True
        try:
            async for raw in self._ws.iter_text():
                if not self._running:
                    break
                await self._handle_message(raw)
        except Exception as exc:
            logger.error(f"ExotelAudioStream error: {exc}")
            raise

    async def _handle_message(self, raw: str) -> None:
        try:
            msg: dict[str, Any] = json.loads(raw)
        except json.JSONDecodeError:
            return

        event = msg.get("event")

        if event == "connected":
            logger.info("Exotel stream connected")

        elif event == "start":
            start = msg.get("start", {})
            self._stream_sid = msg.get("streamSid")
            self._call_sid = start.get("callSid")
            # Exotel passes the caller's number in customParameters
            custom = start.get("customParameters", {})
            self._caller_number = custom.get("From") or custom.get("from") or ""
            logger.info(
                f"Stream started sid={self._stream_sid}"
                f" call={self._call_sid} from={self._caller_number or 'unknown'}"
            )
            if self._on_start and self._call_sid is not None:
                await self._on_start(self._call_sid, self._caller_number)

        elif event == "media":
            media = msg.get("media", {})
            encoded = media.get("payload", "")
            if encoded:
                audio_bytes = base64.b64decode(encoded)
                await self._on_audio(audio_bytes)

        elif event == "dtmf":
            digit = msg.get("dtmf", {}).get("digit", "")
            if digit and self._on_dtmf:
                await self._on_dtmf(digit)

        elif event == "stop":
            self._running = False
            logger.info(f"Stream stopped sid={self._stream_sid}")

    async def send_audio(self, audio_bytes: bytes) -> None:
        """Send μ-law or base64-encoded audio back to the caller."""
        payload = base64.b64encode(audio_bytes).decode()
        message = json.dumps(
            {
                "event": "media",
                "streamSid": self._stream_sid,
                "media": {"payload": payload},
            }
        )
        await self._ws.send_text(message)

    async def stop(self) -> None:
        self._running = False
        message = json.dumps({"event": "stop", "streamSid": self._stream_sid})
        try:
            await self._ws.send_text(message)
        except Exception as exc:
            logger.debug(f"Stream stop send failed: {exc}")
