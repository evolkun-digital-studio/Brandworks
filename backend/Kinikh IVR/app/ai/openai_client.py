"""Central OpenAI client: retry, exponential backoff, rate-limit, logging, streaming."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
import io
import json
import time
from typing import Any

from loguru import logger
import openai
from openai import AsyncOpenAI

from app.core.config import get_settings

_MAX_RETRIES = 3
_BASE_BACKOFF = 1.0
_BACKOFF_FACTOR = 2.0
_MAX_BACKOFF = 30.0
_DEFAULT_TIMEOUT = 30.0

_RETRYABLE_TYPES = (
    openai.APITimeoutError,
    openai.APIConnectionError,
)


def _parse_retry_after(exc: openai.RateLimitError, default: float) -> float:
    """Extract Retry-After header value or fall back to default."""
    try:
        if hasattr(exc, "response") and exc.response is not None:
            header = exc.response.headers.get("retry-after")
            if header:
                return min(float(header), _MAX_BACKOFF)
    except Exception as parse_exc:
        logger.debug(f"[openai] could not parse retry-after header: {parse_exc}")
    return min(default, _MAX_BACKOFF)


class OpenAIClient:
    """
    Async OpenAI wrapper with retry, exponential backoff, and structured logging.

    All public methods log at INFO before each request and DEBUG on success.
    Retryable errors (timeout, connection, 429) are retried up to _MAX_RETRIES times
    with exponential backoff. Non-retryable 4xx errors raise immediately.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._raw = AsyncOpenAI(
            api_key=settings.openai_api_key,
            timeout=_DEFAULT_TIMEOUT,
            max_retries=0,
        )
        self._model = settings.openai_model
        self._temperature = settings.openai_temperature
        self._max_tokens = settings.openai_max_tokens

    async def _retry(
        self,
        label: str,
        coro_fn: Callable[[], Awaitable[Any]],
    ) -> Any:
        backoff = _BASE_BACKOFF
        last_exc: Exception | None = None

        for attempt in range(1, _MAX_RETRIES + 1):
            t0 = time.monotonic()
            try:
                result = await coro_fn()
                elapsed = time.monotonic() - t0
                logger.debug(f"[openai] {label} ok attempt={attempt} elapsed={elapsed:.2f}s")
                return result
            except openai.RateLimitError as exc:
                last_exc = exc
                wait = _parse_retry_after(exc, backoff)
                logger.warning(
                    f"[openai] {label} rate_limit attempt={attempt}/{_MAX_RETRIES}"
                    f" retry_after={wait:.1f}s"
                )
                await asyncio.sleep(wait)
            except _RETRYABLE_TYPES as exc:
                last_exc = exc
                exc_name = type(exc).__name__
                logger.warning(
                    f"[openai] {label} {exc_name} attempt={attempt}/{_MAX_RETRIES}"
                    f" backoff={backoff:.1f}s"
                )
                await asyncio.sleep(backoff)
            except openai.APIStatusError as exc:
                if exc.status_code == 429:
                    last_exc = exc
                    logger.warning(
                        f"[openai] {label} 429 attempt={attempt}/{_MAX_RETRIES}"
                        f" backoff={backoff:.1f}s"
                    )
                    await asyncio.sleep(backoff)
                else:
                    logger.error(f"[openai] {label} http={exc.status_code} body={exc.body!r}")
                    raise

            backoff = min(backoff * _BACKOFF_FACTOR, _MAX_BACKOFF)

        logger.error(f"[openai] {label} exhausted {_MAX_RETRIES} attempts: {last_exc}")
        raise last_exc  # type: ignore[misc]

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        json_mode: bool = False,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> str:
        """Single chat completion — returns assistant message content."""
        m = model or self._model
        t = temperature if temperature is not None else self._temperature
        mt = max_tokens or self._max_tokens
        kwargs: dict[str, Any] = {
            "model": m,
            "messages": messages,
            "temperature": t,
            "max_tokens": mt,
            "timeout": timeout,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        logger.info(f"[openai] chat model={m} turns={len(messages)} json_mode={json_mode}")

        resp = await self._retry(
            f"chat:{m}",
            lambda: self._raw.chat.completions.create(**kwargs),
        )
        content = resp.choices[0].message.content.strip()
        usage = resp.usage
        logger.debug(f"[openai] chat done tokens={usage.total_tokens if usage else '?'}")
        return content

    async def chat_json(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        max_tokens: int = 512,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> dict[str, Any]:
        """Chat completion with JSON response_format — returns parsed dict."""
        raw = await self.chat(
            messages,
            model=model,
            temperature=0,
            max_tokens=max_tokens,
            json_mode=True,
            timeout=timeout,
        )
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.error(f"[openai] json_decode_error: {exc} | raw={raw[:200]!r}")
            return {}

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        """Stream chat completion tokens — yields each content delta."""
        m = model or self._model
        t = temperature if temperature is not None else self._temperature
        mt = max_tokens or self._max_tokens

        logger.info(f"[openai] stream_chat model={m} turns={len(messages)}")

        stream = await self._raw.chat.completions.create(
            model=m,
            messages=messages,
            temperature=t,
            max_tokens=mt,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def transcribe(
        self,
        audio_bytes: bytes,
        *,
        language: str | None = None,
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> str:
        """Transcribe audio via Whisper-1. Returns transcript text."""
        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = "audio.wav"
        kwargs: dict[str, Any] = {
            "model": "whisper-1",
            "file": audio_file,
            "timeout": timeout,
        }
        if language and language != "hi-en":
            kwargs["language"] = "hi" if language == "hi" else "en"

        logger.info(f"[openai] transcribe language={language} bytes={len(audio_bytes)}")

        resp = await self._retry(
            "whisper",
            lambda: self._raw.audio.transcriptions.create(**kwargs),
        )
        text = resp.text.strip()
        logger.debug(f"[openai] transcribe result={text[:80]!r}")
        return text

    async def tts(
        self,
        text: str,
        *,
        model: str = "tts-1",
        voice: str = "alloy",
        timeout: float = _DEFAULT_TIMEOUT,
    ) -> bytes:
        """Text-to-speech via OpenAI TTS — returns MP3 bytes."""
        logger.info(f"[openai] tts model={model} voice={voice} chars={len(text)}")

        resp = await self._retry(
            f"tts:{voice}",
            lambda: self._raw.audio.speech.create(
                model=model, voice=voice, input=text, timeout=timeout
            ),
        )
        return resp.content

    async def tts_stream(
        self,
        text: str,
        *,
        model: str = "tts-1",
        voice: str = "alloy",
    ) -> AsyncIterator[bytes]:
        """Stream TTS audio in 4 KB chunks for lower first-byte latency."""
        logger.info(f"[openai] tts_stream model={model} voice={voice}")

        async with self._raw.audio.speech.with_streaming_response.create(
            model=model, voice=voice, input=text
        ) as response:
            async for chunk in response.iter_bytes(chunk_size=4096):
                if chunk:
                    yield chunk

    @staticmethod
    def load_prompt(name: str, **kwargs: str) -> str:
        """
        Load and render a named prompt template from app.prompts.system.

        name must match an uppercase constant in that module, e.g. "greeting_prompt".
        kwargs are forwarded to str.format().
        """
        from app.prompts import system as prompt_module

        template: str | None = getattr(prompt_module, name.upper(), None)
        if template is None:
            raise KeyError(f"Prompt {name.upper()!r} not found in app.prompts.system")
        return template.format(**kwargs) if kwargs else template


class ChatSession:
    """
    Stateful multi-turn conversation backed by OpenAIClient.

    Maintains full message history so each call automatically includes context.
    Useful for long-running call sessions where GPT needs prior turns.
    """

    def __init__(
        self,
        client: OpenAIClient,
        *,
        system_prompt: str = "",
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> None:
        self._client = client
        self._model = model
        self._temperature = temperature
        self._max_tokens = max_tokens
        self._messages: list[dict[str, str]] = []
        if system_prompt:
            self._messages.append({"role": "system", "content": system_prompt})

    async def send(self, user_message: str) -> str:
        """Append a user turn, get assistant reply, append reply to history."""
        self._messages.append({"role": "user", "content": user_message})
        reply = await self._client.chat(
            self._messages,
            model=self._model,
            temperature=self._temperature,
            max_tokens=self._max_tokens,
        )
        self._messages.append({"role": "assistant", "content": reply})
        return reply

    async def stream_send(self, user_message: str) -> AsyncIterator[str]:
        """Streaming version of send — yields tokens and appends final reply."""
        self._messages.append({"role": "user", "content": user_message})
        accumulated = ""
        async for token in self._client.stream_chat(
            self._messages,
            model=self._model,
            temperature=self._temperature,
            max_tokens=self._max_tokens,
        ):
            accumulated += token
            yield token
        self._messages.append({"role": "assistant", "content": accumulated})

    def add_context(self, role: str, content: str) -> None:
        """Inject a message into the history without triggering a completion."""
        self._messages.append({"role": role, "content": content})

    def clear(self) -> None:
        """Reset history, preserving the system prompt if one was set."""
        system = next((m for m in self._messages if m["role"] == "system"), None)
        self._messages = [system] if system else []

    @property
    def history(self) -> list[dict[str, str]]:
        return list(self._messages)

    @property
    def turn_count(self) -> int:
        return sum(1 for m in self._messages if m["role"] == "user")


_singleton: OpenAIClient | None = None


def get_openai_client() -> OpenAIClient:
    """Return the module-level OpenAIClient singleton."""
    global _singleton
    if _singleton is None:
        _singleton = OpenAIClient()
    return _singleton
