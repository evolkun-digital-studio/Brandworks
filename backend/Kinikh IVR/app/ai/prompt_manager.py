"""Prompt manager — renders prompt templates with runtime variables."""

from __future__ import annotations

from typing import Any

from app.prompts.system import (
    CONFIRMATION_PROMPT_EN,
    CONFIRMATION_PROMPT_HI,
    CONFIRMATION_PROMPT_HI_EN,
    CONVERSATION_QUESTIONS,
    DEPARTMENT_CLASSIFICATION_PROMPT,
    FAREWELL_EN,
    FAREWELL_HI,
    FAREWELL_HI_EN,
    GREETING_PROMPT,
    LANGUAGE_DETECTION_PROMPT,
    LEAD_EXTRACTION_PROMPT,
    SUMMARY_PROMPT,
)


class PromptManager:
    """Renders all externalized prompts — no prompt text lives outside this module."""

    def greeting(self, company_name: str, departments: str) -> str:
        return GREETING_PROMPT.format(company_name=company_name, departments=departments)

    def lead_extraction(self, transcript: str, caller_phone: str) -> str:
        return LEAD_EXTRACTION_PROMPT.format(transcript=transcript, caller_phone=caller_phone)

    def department_classification(
        self, company_name: str, departments_json: str, requirement: str
    ) -> str:
        return DEPARTMENT_CLASSIFICATION_PROMPT.format(
            company_name=company_name,
            departments_json=departments_json,
            requirement=requirement,
        )

    def language_detection(self, text: str) -> str:
        return LANGUAGE_DETECTION_PROMPT.format(text=text)

    def summary(self, transcript: str) -> str:
        return SUMMARY_PROMPT.format(transcript=transcript)

    def question(self, field: str, language: str) -> str:
        for q in CONVERSATION_QUESTIONS:
            if q["field"] == field:
                if language == "hi":
                    return q.get("hi", q["en"])
                if language == "hi-en":
                    return q.get("hi-en", q.get("hi", q["en"]))
                return q.get("en", "")
        return ""

    def confirmation(self, language: str, **kwargs: Any) -> str:
        if language == "hi":
            template = CONFIRMATION_PROMPT_HI
        elif language == "hi-en":
            template = CONFIRMATION_PROMPT_HI_EN
        else:
            template = CONFIRMATION_PROMPT_EN
        return template.format(**kwargs)

    def farewell(self, language: str, company_name: str) -> str:
        if language == "hi":
            template = FAREWELL_HI
        elif language == "hi-en":
            template = FAREWELL_HI_EN
        else:
            template = FAREWELL_EN
        return template.format(company_name=company_name)
