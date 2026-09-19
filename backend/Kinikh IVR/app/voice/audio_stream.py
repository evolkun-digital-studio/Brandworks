"""Audio buffer — accumulates incoming μ-law chunks and triggers STT."""

from __future__ import annotations

import asyncio
from collections.abc import Callable, Coroutine


class AudioBuffer:
    """
    Accumulates raw audio bytes and flushes to a callback when either:
    - silence threshold is reached (no new audio for `silence_ms`)
    - buffer size exceeds `max_bytes`
    """

    def __init__(
        self,
        on_flush: Callable[[bytes], Coroutine],
        silence_ms: int = 800,
        max_bytes: int = 32_000,
        sample_rate: int = 8000,
    ) -> None:
        self._on_flush = on_flush
        self._silence_ms = silence_ms
        self._max_bytes = max_bytes
        self._sample_rate = sample_rate
        self._buffer = bytearray()
        self._silence_task: asyncio.Task | None = None

    async def push(self, chunk: bytes) -> None:
        self._buffer.extend(chunk)
        self._reset_silence_timer()
        if len(self._buffer) >= self._max_bytes:
            await self._flush()

    def _reset_silence_timer(self) -> None:
        if self._silence_task and not self._silence_task.done():
            self._silence_task.cancel()
        self._silence_task = asyncio.create_task(self._silence_flush())

    async def _silence_flush(self) -> None:
        await asyncio.sleep(self._silence_ms / 1000)
        await self._flush()

    async def _flush(self) -> None:
        if not self._buffer:
            return
        data = bytes(self._buffer)
        self._buffer.clear()
        await self._on_flush(data)

    async def drain(self) -> None:
        """Force-flush remaining audio (e.g. on call end)."""
        if self._silence_task and not self._silence_task.done():
            self._silence_task.cancel()
        await self._flush()
