"""Decide whether a Dashboard question needs the AI agent or a quick SerpApi search.

Rule-based on purpose: no LLM call, so simple lookups cost one search and no Gemini quota.
"""

import re

PERSONAL = re.compile(
    r"\b\d{2,3}(\.\d+)?\s*(%|percent|percentile|%ile|ile)"
    r"|\b(rank|marks|scored?|i got|i have|my|budget|lakhs?|lpa|rs\.?|inr)\b|₹"
    r"|\b(obc|ebc|sc|st|nt|sbc|ews|tfws|minority)\b",
    re.IGNORECASE,
)
COMPARE = re.compile(r"\b(vs\.?|versus|compare|comparison|better|difference|or)\b", re.IGNORECASE)
ADVICE = re.compile(
    r"\b(should|which one|can i|eligible|eligibility|recommend|suggest|advi[cs]e|checklist|plan"
    r"|how (do|can|to)|what (should|to do)|worth|chances?|help me|(options?|what) after)\b",
    re.IGNORECASE,
)
TOPICS = {
    "colleges": re.compile(r"\b(colleges?|institutes?|universit(y|ies))\b", re.IGNORECASE),
    "cutoffs": re.compile(r"\b(cut ?offs?|merit list)\b", re.IGNORECASE),
    "fees": re.compile(r"\b(fees?|tuition)\b", re.IGNORECASE),
    "scholarships": re.compile(r"\b(scholarships?|concessions?|mahadbt|freeship)\b", re.IGNORECASE),
    "news": re.compile(r"\b(news|latest|updates?)\b", re.IGNORECASE),
    "videos": re.compile(r"\b(videos?|youtube|tours?)\b", re.IGNORECASE),
    "books": re.compile(r"\b(books?|textbooks?|study material|solved papers?|practice papers?)\b", re.IGNORECASE),
    "careers": re.compile(r"\b(careers?|jobs?|placements?|salar(y|ies)|scope)\b", re.IGNORECASE),
    "trends": re.compile(r"\b(trends?|trending|popular|demand)\b", re.IGNORECASE),
}
LONG_QUESTION_WORDS = 12

MODES = {"auto", "search", "agent"}


def classify_question(question: str) -> tuple[str, str]:
    """Return ("agent" | "search", human-readable reason)."""
    if PERSONAL.search(question):
        return "agent", "Uses your details (score, budget or category)"
    if COMPARE.search(question):
        return "agent", "Compares options"
    if ADVICE.search(question):
        return "agent", "Asks for advice or a plan"
    topics = [name for name, pattern in TOPICS.items() if pattern.search(question)]
    if len(topics) >= 2:
        return "agent", f"Combines {' and '.join(topics[:3])}"
    if len(question.split()) > LONG_QUESTION_WORDS:
        return "agent", "Detailed question"
    return "search", "Simple lookup"


def choose_route(question: str, mode: str) -> tuple[str, str, bool]:
    """Return (route, reason, automatic). `mode` is "auto", "search" or "agent"."""
    if mode == "search":
        return "search", "chosen by you", False
    if mode == "agent":
        return "agent", "chosen by you", False
    route, reason = classify_question(question)
    return route, reason, True
