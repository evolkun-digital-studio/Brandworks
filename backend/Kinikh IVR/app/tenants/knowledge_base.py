"""Department knowledge bases — contextual information for AI responses."""

from __future__ import annotations

KNOWLEDGE_BASES: dict[str, str] = {
    "sales": """
    We offer a range of products and solutions tailored to enterprise and SME clients.
    Our pricing is flexible and based on requirements.
    Typical sales cycles range from 1 week (SME) to 3 months (enterprise).
    Demos can be scheduled at any time via the website.
    """,
    "support": """
    Support is available Monday-Saturday 9am-6pm IST.
    We use a ticketing system — tickets are resolved within 24 hours (P2) or 4 hours (P1).
    Remote support via TeamViewer is available on request.
    Self-service portal: support.kinikh.com
    """,
    "billing": """
    Invoices are generated on the 1st of each month.
    Accepted payment methods: NEFT, IMPS, credit card, UPI.
    GST invoice is provided for all transactions.
    For disputes, email billing@kinikh.com with invoice number.
    """,
    "hr": """
    Current openings are listed on careers.kinikh.com.
    Interview process: 2 rounds (technical + HR).
    Joining process takes 2-4 weeks from offer letter.
    """,
    "technical": """
    We provide API integration, custom development, and cloud migration services.
    SLA: 99.9% uptime guaranteed for production systems.
    Tech stack: Python, React, PostgreSQL, AWS/GCP.
    """,
}


def get_knowledge_base(department: str) -> str:
    return KNOWLEDGE_BASES.get(department.lower(), "")
