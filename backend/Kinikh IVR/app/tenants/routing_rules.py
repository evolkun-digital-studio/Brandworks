"""Business rules for department routing — keyword and priority overrides."""

from __future__ import annotations

ROUTING_RULES: dict[str, list[str]] = {
    "sales": [
        "buy",
        "purchase",
        "pricing",
        "demo",
        "quote",
        "offer",
        "product",
        "kharidna",
        "daam",
    ],
    "support": [
        "help",
        "issue",
        "problem",
        "bug",
        "not working",
        "error",
        "complaint",
        "madad",
        "samasya",
    ],
    "billing": [
        "invoice",
        "payment",
        "bill",
        "refund",
        "charge",
        "invoice",
        "payment",
        "bhugtan",
        "raseed",
    ],
    "hr": ["job", "career", "hiring", "vacancy", "interview", "resume", "naukri", "vacancy"],
    "technical": [
        "api",
        "integration",
        "developer",
        "code",
        "deployment",
        "cloud",
        "server",
        "technical",
    ],
}


def keyword_route(text: str) -> str | None:
    """Fast keyword-based routing before hitting OpenAI for classification."""
    lower = text.lower()
    scores: dict[str, int] = {}
    for dept, keywords in ROUTING_RULES.items():
        hits = sum(1 for kw in keywords if kw in lower)
        if hits:
            scores[dept] = hits
    if not scores:
        return None
    return max(scores, key=lambda d: scores[d])
