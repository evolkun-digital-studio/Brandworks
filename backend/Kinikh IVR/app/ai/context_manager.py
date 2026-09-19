"""Per-call conversation context — persists in memory during a call."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
import time


@dataclass
class Message:
    role: str  # "system" | "user" | "assistant"
    content: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class CallContext:
    call_sid: str
    caller_number: str
    language: str = "en"
    messages: list[Message] = field(default_factory=list)
    collected: dict[str, str | None] = field(
        default_factory=lambda: {
            "name": None,
            "phone": None,
            "email": None,
            "department": None,
            "requirement": None,
            "additional_notes": None,
        }
    )
    confirmed: bool = False
    ended: bool = False
    transcript_parts: list[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)

    def add_message(self, role: str, content: str) -> None:
        self.messages.append(Message(role=role, content=content))
        self.transcript_parts.append(f"[{role.upper()}] {content}")

    @property
    def transcript(self) -> str:
        return "\n".join(self.transcript_parts)

    @property
    def openai_messages(self) -> list[dict[str, str]]:
        return [{"role": m.role, "content": m.content} for m in self.messages]

    def all_required_collected(self) -> bool:
        required = ["name", "phone", "requirement"]
        return all(self.collected.get(f) for f in required)


class ContextManager:
    """Thread-safe in-memory store for active call contexts."""

    def __init__(self) -> None:
        self._store: dict[str, CallContext] = {}
        self._lock = asyncio.Lock()

    async def create(self, call_sid: str, caller_number: str) -> CallContext:
        async with self._lock:
            ctx = CallContext(call_sid=call_sid, caller_number=caller_number)
            ctx.collected["phone"] = caller_number
            self._store[call_sid] = ctx
            return ctx

    async def get(self, call_sid: str) -> CallContext | None:
        return self._store.get(call_sid)

    async def get_or_create(self, call_sid: str, caller_number: str) -> CallContext:
        ctx = await self.get(call_sid)
        if ctx is None:
            ctx = await self.create(call_sid, caller_number)
        return ctx

    async def remove(self, call_sid: str) -> None:
        async with self._lock:
            self._store.pop(call_sid, None)

    async def count(self) -> int:
        return len(self._store)


# Module-level singleton shared across the application lifetime.
context_manager = ContextManager()
