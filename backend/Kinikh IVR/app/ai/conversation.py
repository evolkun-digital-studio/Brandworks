"""OpenAI conversation engine — multi-turn dialogue with language-aware responses."""

from __future__ import annotations

from typing import Any

from loguru import logger

from app.ai.context_manager import CallContext
from app.ai.openai_client import OpenAIClient, get_openai_client
from app.ai.prompt_manager import PromptManager
from app.core.config import get_settings

_FALLBACK_EN = "I'm sorry, I'm having trouble right now. Please call back in a moment."
_FALLBACK_HI = "मुझे खेद है, मुझे अभी कुछ समस्या हो रही है। कृपया थोड़ी देर बाद कॉल करें।"
_FALLBACK_HI_EN = "I'm sorry, abhi kuch technical issue hai. Please thodi der baad call karein."


class ConversationEngine:
    """Drives multi-turn AI dialogue using GPT-4o chat completions."""

    def __init__(
        self,
        departments: list[dict[str, Any]],
        client: OpenAIClient | None = None,
    ) -> None:
        self._client = client or get_openai_client()
        self._company = get_settings().company_name
        self._departments = departments
        self._prompt_manager = PromptManager()

    def _build_system_prompt(self, context: CallContext) -> str:
        dept_names = ", ".join(d["name"] for d in self._departments)
        base = self._prompt_manager.greeting(
            company_name=self._company,
            departments=dept_names,
        )
        if context.language == "hi":
            base += "\n\nIMPORTANT: Respond ONLY in Hindi (Devanagari script)."
        elif context.language == "hi-en":
            base += (
                "\n\nIMPORTANT: Respond in natural Hinglish "
                "(Hindi-English mix, Roman script for Hindi words)."
            )
        return base

    async def get_next_response(self, context: CallContext, user_input: str) -> str:
        """Add user input to context, call OpenAI, return the assistant reply."""
        context.add_message("user", user_input)

        system_prompt = self._build_system_prompt(context)
        messages = [{"role": "system", "content": system_prompt}, *context.openai_messages]

        try:
            reply = await self._client.chat(messages)
            context.add_message("assistant", reply)
            return reply
        except Exception as exc:
            logger.error(f"[conversation] OpenAI error: {exc}")
            fallback = self._language_fallback(context.language)
            context.add_message("assistant", fallback)
            return fallback

    async def get_greeting(self, context: CallContext) -> str:
        """Return a language-appropriate greeting and record it in context."""
        if context.language == "hi":
            greeting = f"नमस्ते! {self._company} में आपका स्वागत है। " "मैं आपकी कैसे मदद कर सकता हूँ?"
        elif context.language == "hi-en":
            greeting = (
                f"Hello! {self._company} mein aapka swagat hai. "
                "Main aapki kaise help kar sakta hoon?"
            )
        else:
            greeting = f"Hello! Welcome to {self._company}. How may I assist you today?"
        context.add_message("assistant", greeting)
        return greeting

    @staticmethod
    def _language_fallback(language: str) -> str:
        if language == "hi":
            return _FALLBACK_HI
        if language == "hi-en":
            return _FALLBACK_HI_EN
        return _FALLBACK_EN
