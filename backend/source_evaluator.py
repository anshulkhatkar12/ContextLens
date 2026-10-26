"""
ContextLens – Source evaluator.

Takes raw search results and the claim text, then uses the configured LLM
(if available) to assess whether each source supports, contradicts,
contextualizes, or is irrelevant to the claim.

If no LLM is configured, a lightweight keyword-based heuristic is used but
the result is clearly labelled as heuristic-only.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

from .models import AdditionalSource
from .llm_provider import evaluate_source_relevance

logger = logging.getLogger("contextlens.source_evaluator")


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

def _detect_provider_and_key() -> tuple[Optional[str], Optional[str]]:
    """Return (provider_name, api_key) for the active LLM. Local models require NO api_key."""
    use_local = os.getenv("USE_LOCAL_MODEL", "true").lower() not in ("false", "0", "no")
    llm_provider = os.getenv("LLM_PROVIDER", "").lower()

    gemini_key    = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    openai_key    = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    if gemini_key:
        return "gemini", gemini_key
    if openai_key:
        return "openai", openai_key
    if anthropic_key:
        return "anthropic", anthropic_key

    # Default to local model (Qwen / Ollama) without needing API keys
    if use_local or llm_provider in ("local", "qwen", "ollama"):
        return "local", ""

    return None, None


# ---------------------------------------------------------------------------
# Keyword heuristic (fallback, clearly labelled)
# ---------------------------------------------------------------------------

_SUPPORT_WORDS  = {"confirm", "agree", "support", "consistent", "verified", "same", "yes", "true"}
_CONTRA_WORDS   = {"contradict", "differ", "disagree", "false", "refute", "deny", "incorrect", "wrong"}
_CONTEXT_WORDS  = {"however", "but", "although", "whereas", "compared", "while", "context", "update", "revised"}


def _heuristic_evaluate(claim_text: str, snippet: str) -> Dict[str, Any]:
    """
    Very basic keyword-overlap heuristic for when no LLM is available.
    Results are explicitly labelled as heuristic-only.
    """
    claim_words  = set(claim_text.lower().split())
    snippet_lower = snippet.lower()
    snippet_words = set(snippet_lower.split())

    overlap = claim_words & snippet_words
    overlap_ratio = len(overlap) / max(len(claim_words), 1)

    if any(w in snippet_lower for w in _CONTRA_WORDS):
        rel = "contradicts"
        reason = "Snippet contains language that may conflict with the claim."
    elif any(w in snippet_lower for w in _CONTEXT_WORDS):
        rel = "contextualizes"
        reason = "Snippet appears to add context or qualification to the claim."
    elif overlap_ratio > 0.3:
        rel = "supports"
        reason = f"Snippet shares significant terms with the claim ({', '.join(list(overlap)[:5])})."
    else:
        rel = "unclear"
        reason = "Limited lexical overlap; relevance could not be determined without AI analysis."

    return {
        "relationship_to_claim": rel,
        "relevance_reason": reason + " (heuristic assessment — no LLM configured)",
        "limitations": "Assessed by keyword matching only; semantic accuracy is limited.",
    }


# ---------------------------------------------------------------------------
# Public evaluator
# ---------------------------------------------------------------------------

async def evaluate_sources(
    claim_text: str,
    raw_results: List[Dict[str, Any]],
    max_to_evaluate: int = 5,
) -> List[AdditionalSource]:
    """
    For each raw search result, assess its relationship to the claim.

    Uses the LLM if configured; falls back to keyword heuristic otherwise.
    Returns a list of AdditionalSource objects.
    """
    provider, api_key = _detect_provider_and_key()
    evaluated: List[AdditionalSource] = []

    for raw in raw_results[:max_to_evaluate]:
        title   = raw.get("title",   "")
        url     = raw.get("url",     "")
        snippet = raw.get("snippet", "")
        pub_date = raw.get("published_date", None)
        source_domain = raw.get("source", "")

        if not url:
            continue

        # Evaluate relevance
        if provider and (api_key or provider in ("local", "qwen")) and snippet:
            try:
                eval_result = await evaluate_source_relevance(
                    claim_text=claim_text,
                    source_title=title,
                    source_snippet=snippet,
                    api_key=api_key or "",
                    provider=provider,
                )
            except Exception as exc:
                logger.warning("LLM evaluation failed for '%s': %s", url[:60], exc)
                eval_result = _heuristic_evaluate(claim_text, snippet)
        elif snippet:
            eval_result = _heuristic_evaluate(claim_text, snippet)
        else:
            eval_result = {
                "relationship_to_claim": "unclear",
                "relevance_reason": "No snippet available to assess relevance.",
                "limitations": "No content retrieved.",
            }

        # Infer source type from domain
        domain = source_domain.lower()
        if any(d in domain for d in [".gov", ".edu", ".int", ".un.org"]):
            source_type = "government/academic"
        elif any(d in domain for d in ["scholar", "pubmed", "ncbi", "arxiv", "jstor"]):
            source_type = "academic"
        elif any(d in domain for d in ["wikipedia", "wiki"]):
            source_type = "encyclopedia"
        elif snippet:
            source_type = "news/web"
        else:
            source_type = "web"

        evaluated.append(AdditionalSource(
            title=title or url,
            url=url,
            publisher=source_domain or None,
            published_date=str(pub_date) if pub_date else None,
            source_type=source_type,
            relationship_to_claim=eval_result.get("relationship_to_claim", "unclear"),
            relevance_reason=eval_result.get("relevance_reason", ""),
            supporting_excerpt=snippet if snippet else None,
            limitations=eval_result.get("limitations", None),
            retrieval_status="snippet_only" if snippet else "search_result_only",
        ))

    return evaluated


# ---------------------------------------------------------------------------
# LangChain Filter and Rank Sources
# ---------------------------------------------------------------------------

from .models import SourceItem

def filter_and_rank_sources(
    claim_text: str,
    sources: List[SourceItem],
    top_k: int = 3
) -> List[SourceItem]:
    """
    Evaluates, filters, and ranks retrieved sources by relevance.
    Guarantees no fabricated URLs or falsified relevance.
    """
    claim_words = set(claim_text.lower().split())
    stopwords = {'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'a', 'an'}
    informative_claim_words = {w.strip(".,;:!?\"'()[]") for w in claim_words if len(w) > 3 and w not in stopwords}

    evaluated = []
    for s in sources:
        if not s.snippet:
            s.is_relevant = False
            s.relevance_score = 0.0
            s.verified_claim = None
        else:
            snippet_lower = s.snippet.lower()
            matches = [w for w in informative_claim_words if w in snippet_lower]
            ratio = (len(matches) / len(informative_claim_words)) if informative_claim_words else 0.5
            s.relevance_score = round(min(1.0, max(0.0, ratio)), 2)
            s.is_relevant = s.relevance_score >= 0.25
            if s.is_relevant and matches:
                matched_str = ", ".join(sorted(list(matches))[:3])
                s.verified_claim = f"Discusses matching topics: {matched_str}"
            else:
                s.verified_claim = None
        evaluated.append(s)

    evaluated.sort(key=lambda x: x.relevance_score, reverse=True)
    return evaluated[:top_k]

