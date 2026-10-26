"""
ContextLens – Orchestration pipeline for claim-evidence analysis.

Pipeline steps (in order):
  1. Validate request inputs.
  2. Analyse claim and evidence with the configured LLM.
     Falls back to the explicit heuristic engine (clearly labelled) when
     no API key is configured.
  3. Identify unanswered questions and generate search queries.
  4. Discover additional sources via the search provider.
  5. Evaluate retrieved sources against the claim.
  6. Synthesise results with clear attribution.
  7. Validate and return the CompareResponse.

Security rules:
  - API keys read from environment only.
  - No key material is logged or included in responses.
  - Passage text is length-limited before sending to any external provider.
  - Retrieved search content is treated as untrusted.
"""

from __future__ import annotations

import logging
import os
import re
from typing import List, Optional, Tuple

from .models import ClaimItem, CompareResponse, AdditionalSource
from .llm_provider import call_gemini, call_openai, call_anthropic
from .source_search import discover_sources
from .source_evaluator import evaluate_sources

logger = logging.getLogger("contextlens.analyzer")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ENABLE_SOURCE_SEARCH = os.getenv("ENABLE_SOURCE_SEARCH", "true").lower() != "false"


# ---------------------------------------------------------------------------
# Provider detection
# ---------------------------------------------------------------------------

def _get_llm_config(
    api_key_override: Optional[str] = None
) -> Tuple[Optional[str], Optional[str]]:
    """
    Return (provider_name, api_key) for the first available LLM provider.
    Checks env vars; allows override from request header (backend-to-LLM only).
    """
    gemini_key    = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    openai_key    = os.getenv("OPENAI_API_KEY")
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")

    # Header-supplied key: classify by prefix, never log it
    if api_key_override:
        key = api_key_override.strip()
        if key.startswith("sk-ant-"):
            return "anthropic", key
        elif key.startswith("sk-"):
            return "openai", key
        else:
            return "gemini", key

    if gemini_key:
        return "gemini", gemini_key
    if openai_key:
        return "openai", openai_key
    if anthropic_key:
        return "anthropic", anthropic_key

    return None, None


# ---------------------------------------------------------------------------
# Heuristic fallback (legacy – clearly labelled, not presented as AI)
# ---------------------------------------------------------------------------

STOPWORDS = {
    'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'from', 'to',
    'at', 'in', 'on', 'by', 'for', 'with', 'about', 'against', 'between',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up',
    'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will',
    'just', 'should', 'now', 'a', 'an', 'and', 'or', 'as', 'of', 'that',
    'this', 'these', 'those', 'it', 'its',
}


def _extract_features(text: str):
    raw_tokens = re.findall(r'[a-zA-Z0-9]+', text)

    def _norm(w: str) -> str:
        w = w.lower().strip(".,;:!?\"'()[]{})")
        if w.endswith("days"):  return w[:-1]
        if w.endswith("ing"):   return w[:-3]
        if w.endswith("ed"):    return w[:-2]
        if w.endswith("es"):    return w[:-2]
        if w.endswith("s") and not w.endswith("ss"): return w[:-1]
        return w

    tokens = {_norm(t) for t in raw_tokens if t.strip()}
    content_tokens = {t for t in tokens if t not in STOPWORDS and len(t) > 1}
    numbers = set(re.findall(r'\b\d+(?:\.\d+)?\b', text))
    return content_tokens, numbers


def _run_heuristic_analysis(claim_a: ClaimItem, claim_b: ClaimItem) -> CompareResponse:
    """
    Fallback deterministic heuristic engine.
    ALWAYS labelled as heuristic; never presented as AI output.
    """
    t_a = claim_a.text.lower()
    t_b = claim_b.text.lower()

    label_a = "Source A"
    label_b = "Source B"

    heuristic_caveat = (
        "[HEURISTIC MODE — no LLM configured. "
        "Results are based on keyword and numeric pattern matching only; "
        "semantic accuracy is limited. Configure an API key for AI analysis.]"
    )
    limitations = [
        "This analysis was produced by keyword matching, not AI semantic analysis.",
        "Accuracy is limited. Configure GEMINI_API_KEY, OPENAI_API_KEY, or "
        "ANTHROPIC_API_KEY in the backend .env for genuine AI-powered analysis.",
    ]

    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    found_days_a = [d for d in days if d in t_a]
    found_days_b = [d for d in days if d in t_b]

    # Day contradiction
    if found_days_a and found_days_b and any(d not in found_days_b for d in found_days_a):
        return CompareResponse(
            classification="CONTRADICTED",
            analysis_summary=heuristic_caveat + f" {label_a} mentions {', '.join(found_days_a)} while {label_b} mentions {', '.join(found_days_b)} — these appear to be mutually exclusive days for the same event.",
            explanation=heuristic_caveat,
            claim_interpretation=f"Claim refers to schedule on: {', '.join(found_days_a)}.",
            evidence_interpretation=f"Evidence refers to schedule on: {', '.join(found_days_b)}.",
            key_differences=[
                f"{label_a} specifies: {', '.join(found_days_a)}",
                f"{label_b} specifies: {', '.join(found_days_b)}",
            ],
            supporting_points=[],
            contradicting_points=[f"{label_b} states different days than {label_a}."],
            missing_context=[
                "Whether the event spans multiple days.",
                "Publication dates of both sources.",
            ],
            verification_questions=[
                "Which source is the official, most recent schedule?",
                "Was the event rescheduled between the two publication dates?",
            ],
            confidence=0.45,
            confidence_reason="Heuristic day-pattern match; no semantic analysis performed.",
            limitations=limitations,
            evidence_a=claim_a.text,
            evidence_b=claim_b.text,
            engine="heuristic",
        )

    # Day consistency
    if found_days_a and found_days_b and set(found_days_a) == set(found_days_b):
        return CompareResponse(
            classification="SUPPORTED",
            analysis_summary=heuristic_caveat + f" Both passages mention the same day(s): {', '.join(found_days_a)}.",
            explanation=heuristic_caveat,
            claim_interpretation=f"Claim refers to: {', '.join(found_days_a)}.",
            evidence_interpretation=f"Evidence also refers to: {', '.join(found_days_b)}.",
            key_differences=["No substantive day-of-week discrepancy identified."],
            supporting_points=[f"Both passages reference {', '.join(found_days_a)}."],
            contradicting_points=[],
            missing_context=["Check whether specific times or room assignments are provided."],
            verification_questions=[
                "Do both sources cite the same official announcement?",
                "Are there any secondary tracks on adjacent days?",
            ],
            confidence=0.50,
            confidence_reason="Heuristic day-pattern match only; no semantic analysis.",
            limitations=limitations,
            evidence_a=claim_a.text,
            evidence_b=claim_b.text,
            engine="heuristic",
        )

    # Numeric conflict
    c_a, num_a = _extract_features(t_a)
    c_b, num_b = _extract_features(t_b)
    overlap = c_a & c_b
    min_tokens = min(len(c_a), len(c_b)) if (c_a and c_b) else 0
    overlap_ratio = (len(overlap) / min_tokens) if min_tokens > 0 else 0.0

    pricing_words = {"shipping", "tax", "taxes", "checkout", "handling", "delivery",
                     "fees", "msrp", "base", "price", "discount", "invoice", "order"}
    has_pricing = bool(pricing_words & (set(t_a.split()) | set(t_b.split())))

    years_a = re.findall(r'\b(19\d\d|20\d\d)\b', t_a)
    years_b = re.findall(r'\b(19\d\d|20\d\d)\b', t_b)
    different_years = years_a and years_b and set(years_a) != set(years_b)

    if different_years:
        return CompareResponse(
            classification="DIFFERENT_CONTEXT",
            analysis_summary=heuristic_caveat + f" {label_a} references year(s) {', '.join(set(years_a))} while {label_b} references {', '.join(set(years_b))}. This likely reflects information from different time periods rather than a contradiction.",
            explanation=heuristic_caveat,
            claim_interpretation=f"Year(s) referenced: {', '.join(set(years_a))}.",
            evidence_interpretation=f"Year(s) referenced: {', '.join(set(years_b))}.",
            key_differences=[
                f"{label_a} cites year(s): {', '.join(set(years_a))}",
                f"{label_b} cites year(s): {', '.join(set(years_b))}",
            ],
            supporting_points=[],
            contradicting_points=[],
            missing_context=[
                "Confirm the specific time period each source is measuring.",
                "Determine whether the data has been updated since either source was published.",
            ],
            verification_questions=[
                "Are both passages reporting on the same time period?",
                "Has the metric changed significantly between the two years cited?",
            ],
            confidence=0.55,
            confidence_reason="Different year patterns detected; no semantic analysis.",
            limitations=limitations,
            evidence_a=claim_a.text,
            evidence_b=claim_b.text,
            engine="heuristic",
        )

    if len(overlap) >= 2 and num_a and num_b and num_a != num_b and not has_pricing:
        topics = ", ".join(sorted(overlap)[:3])
        return CompareResponse(
            classification="CONTRADICTED",
            analysis_summary=heuristic_caveat + f" Both passages discuss '{topics}' but state different numeric values: {label_a} has {', '.join(sorted(num_a))} while {label_b} has {', '.join(sorted(num_b))}.",
            explanation=heuristic_caveat,
            claim_interpretation=f"Numeric values in passage A: {', '.join(sorted(num_a))}.",
            evidence_interpretation=f"Numeric values in passage B: {', '.join(sorted(num_b))}.",
            key_differences=[
                f"{label_a} states numbers: {', '.join(sorted(num_a))}",
                f"{label_b} states numbers: {', '.join(sorted(num_b))}",
            ],
            supporting_points=[],
            contradicting_points=[f"Different figures for shared topic '{topics}'."],
            missing_context=[
                "Whether the numbers refer to the same measurement or metric.",
                "Timeframe and scope of each figure.",
            ],
            verification_questions=[
                "Do both figures measure the same thing in the same conditions?",
                "Has an official update superseded one of these numbers?",
            ],
            confidence=0.40,
            confidence_reason="Numeric mismatch detected via pattern matching; no semantic analysis.",
            limitations=limitations,
            evidence_a=claim_a.text,
            evidence_b=claim_b.text,
            engine="heuristic",
        )

    if has_pricing and num_a and num_b and num_a != num_b:
        return CompareResponse(
            classification="DIFFERENT_CONTEXT",
            analysis_summary=heuristic_caveat + " Both passages cite different figures in a pricing context. The difference likely reflects different pricing scopes (e.g., base price vs. total with taxes and fees).",
            explanation=heuristic_caveat,
            claim_interpretation="Passage A states a numeric figure in a pricing context.",
            evidence_interpretation="Passage B states a different numeric figure in a pricing context.",
            key_differences=[
                "Different numeric values are present in both passages.",
                "Context words (price, tax, shipping, etc.) suggest different pricing scopes.",
            ],
            supporting_points=[],
            contradicting_points=[],
            missing_context=[
                "Whether both figures include the same fees and taxes.",
                "The exact product variant or configuration.",
            ],
            verification_questions=[
                "Does passage A explicitly exclude shipping or taxes?",
                "Does passage B reflect a final checkout total?",
            ],
            confidence=0.45,
            confidence_reason="Pricing keyword and numeric pattern match only.",
            limitations=limitations,
            evidence_a=claim_a.text,
            evidence_b=claim_b.text,
            engine="heuristic",
        )

    if (overlap_ratio >= 0.5 or len(overlap) >= 3) and (num_a == num_b or (not num_a and not num_b)):
        key_topics = ", ".join(sorted(overlap)[:4])
        return CompareResponse(
            classification="SUPPORTED",
            analysis_summary=heuristic_caveat + f" Both passages share significant lexical overlap on topics: {key_topics}, and agree on numeric values (or neither contains numbers).",
            explanation=heuristic_caveat,
            claim_interpretation="Passage A contains significant content terms.",
            evidence_interpretation="Passage B shares those terms and compatible numbers.",
            key_differences=["No substantive factual discrepancies detected by keyword matching."],
            supporting_points=[f"Both passages reference: {key_topics}."],
            contradicting_points=[],
            missing_context=["Check for any special conditions or qualifications not captured in these excerpts."],
            verification_questions=[
                "Do both sources cite the same primary publication?",
                "Are there any conditions not captured in these excerpts?",
            ],
            confidence=0.40,
            confidence_reason="High token overlap with matching numerics; no semantic analysis.",
            limitations=limitations,
            evidence_a=claim_a.text,
            evidence_b=claim_b.text,
            engine="heuristic",
        )

    # Default: insufficient evidence from heuristics
    return CompareResponse(
        classification="INSUFFICIENT_EVIDENCE",
        analysis_summary=heuristic_caveat + " The keyword-based heuristic could not determine a clear relationship between these passages. AI analysis requires an API key to be configured.",
        explanation=heuristic_caveat,
        claim_interpretation="Could not interpret claim without semantic analysis.",
        evidence_interpretation="Could not interpret evidence without semantic analysis.",
        key_differences=[
            f"{label_a} excerpt: \"{claim_a.text[:100]}...\"",
            f"{label_b} excerpt: \"{claim_b.text[:100]}...\"",
        ],
        supporting_points=[],
        contradicting_points=[],
        missing_context=[
            "Configure an AI API key for meaningful analysis.",
            "Publication timestamps and primary source citations.",
        ],
        verification_questions=[
            "Do both passages refer to the same subject under the same conditions?",
            "Are there primary sources that establish the claim directly?",
        ],
        confidence=0.0,
        confidence_reason="No AI analysis performed; heuristic insufficient for these passages.",
        limitations=limitations,
        evidence_a=claim_a.text,
        evidence_b=claim_b.text,
        engine="heuristic",
    )


# ---------------------------------------------------------------------------
# Main orchestration pipeline
# ---------------------------------------------------------------------------

async def analyze_passages(
    claim_a: ClaimItem,
    claim_b: ClaimItem,
    api_key_override: Optional[str] = None,
) -> CompareResponse:
    """
    Full analysis pipeline:
      1. LLM semantic analysis (or labelled heuristic fallback).
      2. Source discovery via web search.
      3. Source evaluation and integration into the response.
    """

    # --- Step 1: LLM or Heuristic Analysis ---
    provider, api_key = _get_llm_config(api_key_override)
    analysis: Optional[CompareResponse] = None
    search_error: Optional[str] = None

    if provider and api_key:
        try:
            if provider == "gemini":
                analysis = await call_gemini(
                    claim_a.text, claim_a.title or "", claim_a.url or "",
                    claim_b.text, claim_b.title or "", claim_b.url or "",
                    api_key,
                )
            elif provider == "openai":
                analysis = await call_openai(
                    claim_a.text, claim_a.title or "", claim_a.url or "",
                    claim_b.text, claim_b.title or "", claim_b.url or "",
                    api_key,
                )
            elif provider == "anthropic":
                analysis = await call_anthropic(
                    claim_a.text, claim_a.title or "", claim_a.url or "",
                    claim_b.text, claim_b.title or "", claim_b.url or "",
                    api_key,
                )

            if analysis:
                analysis.engine = "llm"
                # Back-fill legacy fields if the model omitted them
                if not analysis.evidence_a:
                    object.__setattr__(analysis, "evidence_a", claim_a.text)
                if not analysis.evidence_b:
                    object.__setattr__(analysis, "evidence_b", claim_b.text)

        except Exception as exc:
            logger.warning("LLM analysis failed (%s): %s — falling back to heuristic", provider, exc)
            analysis = None

    if analysis is None:
        if provider and api_key:
            # LLM was configured but call failed
            logger.warning("LLM call failed; using heuristic with warning in response")
        analysis = _run_heuristic_analysis(claim_a, claim_b)

    # Build source references from the supplied passages
    source_refs: List[str] = []
    if claim_a.url:
        source_refs.append(f"Source A — {claim_a.title or 'Untitled'}: {claim_a.url}")
    if claim_b.url:
        source_refs.append(f"Source B — {claim_b.title or 'Untitled'}: {claim_b.url}")
    object.__setattr__(analysis, "source_references", source_refs)

    # --- Steps 2–5: Source Discovery and Evaluation ---
    additional_sources: List[AdditionalSource] = []

    if ENABLE_SOURCE_SEARCH:
        try:
            verification_questions = analysis.verification_questions or []
            raw_results, provider_used = await discover_sources(
                claim_text=claim_a.text,
                verification_questions=verification_questions,
            )

            if raw_results:
                logger.info(
                    "Source discovery returned %d result(s) via %s",
                    len(raw_results),
                    provider_used,
                )
                additional_sources = await evaluate_sources(
                    claim_text=claim_a.text,
                    raw_results=raw_results,
                )
            else:
                logger.info("Source discovery returned no results (provider: %s)", provider_used)
                if provider_used == "none":
                    search_error = (
                        "No search provider configured or all search attempts failed. "
                        "Configure SERPAPI_KEY or BRAVE_SEARCH_KEY for richer source discovery."
                    )

        except Exception as exc:
            logger.warning("Source discovery pipeline failed: %s", exc)
            search_error = f"Source discovery encountered an error: {exc}"

    object.__setattr__(analysis, "additional_sources", additional_sources)

    # Append search error to limitations if applicable
    if search_error:
        current_limitations = list(analysis.limitations or [])
        current_limitations.append(search_error)
        object.__setattr__(analysis, "limitations", current_limitations)

    return analysis
