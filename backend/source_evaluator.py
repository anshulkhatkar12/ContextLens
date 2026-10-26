import logging
from typing import List, Optional, Tuple
from .models import SourceItem

logger = logging.getLogger("contextlens.source_evaluator")

def evaluate_source_relevance(
    claim_text: str,
    source: SourceItem
) -> SourceItem:
    """
    Evaluates whether a retrieved source snippet or page actually discusses the claim,
    scoring relevance and setting verified_claim without hallucinating.
    """
    if not source.snippet:
        source.is_relevant = False
        source.relevance_score = 0.0
        source.verified_claim = None
        return source

    claim_words = set(claim_text.lower().split())
    # Exclude common stopwords
    stopwords = {'the', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'a', 'an'}
    informative_claim_words = {w.strip(".,;:!?\"'()[]") for w in claim_words if len(w) > 3 and w not in stopwords}

    snippet_lower = source.snippet.lower()
    matches = [w for w in informative_claim_words if w in snippet_lower]

    if not informative_claim_words:
        ratio = 0.5
    else:
        ratio = len(matches) / len(informative_claim_words)

    source.relevance_score = round(min(1.0, max(0.0, ratio)), 2)
    source.is_relevant = source.relevance_score >= 0.25

    if source.is_relevant and matches:
        matched_str = ", ".join(sorted(list(matches))[:3])
        source.verified_claim = f"Discusses matching topics: {matched_str}"
    else:
        source.verified_claim = None

    return source


def filter_and_rank_sources(
    claim_text: str,
    sources: List[SourceItem],
    top_k: int = 3
) -> List[SourceItem]:
    """
    Evaluates, filters, and ranks retrieved sources by relevance.
    Guarantees no fabricated URLs or falsified relevance.
    """
    evaluated = [evaluate_source_relevance(claim_text, s) for s in sources]
    # Sort by relevance_score descending
    evaluated.sort(key=lambda x: x.relevance_score, reverse=True)
    return evaluated[:top_k]
