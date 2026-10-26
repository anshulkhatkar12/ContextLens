"""
ContextLens – LLM provider abstraction layer.

Supports: Google Gemini, OpenAI (GPT-4o / GPT-4o-mini), Anthropic Claude.
All calls use structured JSON output and return a validated CompareResponse.

Security rules:
- API keys are read only from environment variables (never passed through to
  the extension or included in any API response).
- User-supplied passages are treated as untrusted content.
- No key material is ever logged.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, Optional

import httpx

from .models import CompareResponse

logger = logging.getLogger("contextlens.llm_provider")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_GEMINI_MODEL  = os.getenv("GEMINI_MODEL",    "gemini-1.5-flash")
DEFAULT_OPENAI_MODEL  = os.getenv("OPENAI_MODEL",    "gpt-4o-mini")
DEFAULT_ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-haiku-20240307")

LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT_SECONDS", "30"))
MAX_INPUT_CHARS = int(os.getenv("MAX_INPUT_CHARS", "8000"))

# ---------------------------------------------------------------------------
# Shared system prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are ContextLens, an expert AI fact-analysis assistant.

Your task: compare two text passages and classify the relationship between them
using ONLY the evidence supplied. Never invent facts, URLs, statistics, quotes,
or source content that are not present in the passages.

CLASSIFICATION (choose exactly one):
  SUPPORTED             – the evidence passage directly supports the claim passage
  CONTRADICTED          – reliable evidence directly conflicts with the claim under
                          comparable conditions (same entity, scope, timeframe)
  PARTIALLY_SUPPORTED   – some aspects of the claim are supported, but the full
                          claim is not established by the evidence
  DIFFERENT_CONTEXT     – passages differ because of dates, scope, definitions,
                          conditions, or measurement methods
  INSUFFICIENT_EVIDENCE – the evidence does not provide enough information to
                          assess the claim
  UNRELATED             – the evidence does not meaningfully address the claim

RULES:
1. Ground every finding in the actual supplied text.
2. Do NOT classify as CONTRADICTED merely because numbers or wording differ;
   first confirm they refer to the same entity, timeframe, scope, and conditions.
3. Two sources agreeing does not automatically mean the claim is true.
4. If a field has no findings, return an empty list or empty string.
5. Never use generic filler such as "Passage A focuses on Manual Input" or
   invent "shipping", "pricing", "hardware" differences unless those words
   genuinely appear in the passages.
6. key_differences must list REAL differences between the supplied passages.
7. supporting_points and contradicting_points must quote or accurately
   paraphrase actual passage text.

Return ONLY a valid JSON object with this exact schema (no markdown fences):
{
  "classification": "...",
  "analysis_summary": "...",
  "claim_interpretation": "...",
  "evidence_interpretation": "...",
  "key_differences": ["..."],
  "supporting_points": ["..."],
  "contradicting_points": ["..."],
  "missing_context": ["..."],
  "verification_questions": ["..."],
  "confidence": 0.0,
  "confidence_reason": "...",
  "limitations": ["..."]
}
"""


def _build_user_prompt(
    text_a: str,
    title_a: str,
    url_a: str,
    text_b: str,
    title_b: str,
    url_b: str,
) -> str:
    """Build the user-facing analysis prompt."""
    # Truncate each passage to avoid runaway costs
    ta = text_a[:MAX_INPUT_CHARS]
    tb = text_b[:MAX_INPUT_CHARS]

    return (
        f"SOURCE A (Claim):\n"
        f"Title: {title_a}\n"
        f"URL: {url_a or 'not provided'}\n"
        f'Passage: """{ta}"""\n\n'
        f"SOURCE B (Evidence):\n"
        f"Title: {title_b}\n"
        f"URL: {url_b or 'not provided'}\n"
        f'Passage: """{tb}"""\n\n'
        f"Analyze the relationship between these passages and return JSON."
    )


def _clean_json(raw: str) -> str:
    """Strip markdown fences that models sometimes add."""
    s = raw.strip()
    # Remove ```json ... ``` or ``` ... ```
    s = re.sub(r"^```(?:json)?\s*", "", s)
    s = re.sub(r"\s*```$", "", s)
    return s.strip()


def _parse_llm_json(raw: str) -> CompareResponse:
    """Parse raw LLM output to CompareResponse, with resilient field handling."""
    cleaned = _clean_json(raw)
    try:
        data: Dict[str, Any] = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(f"LLM returned invalid JSON: {exc}\nRaw output: {raw[:500]}") from exc

    # Map legacy field names that the model might output
    if "explanation" in data and "analysis_summary" not in data:
        data["analysis_summary"] = data["explanation"]
    if "analysis_summary" in data and "explanation" not in data:
        data["explanation"] = data["analysis_summary"]

    # Clamp confidence
    if "confidence" in data:
        try:
            conf = float(data["confidence"])
            data["confidence"] = max(0.0, min(1.0, conf))
        except (TypeError, ValueError):
            data["confidence"] = None

    data["engine"] = "llm"

    try:
        return CompareResponse(**data)
    except Exception as exc:
        raise ValueError(f"LLM response failed schema validation: {exc}") from exc


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------

async def call_gemini(
    text_a: str, title_a: str, url_a: str,
    text_b: str, title_b: str, url_b: str,
    api_key: str,
    model: str = DEFAULT_GEMINI_MODEL,
) -> CompareResponse:
    """Call Google Gemini API for structured analysis."""
    prompt = _build_user_prompt(text_a, title_a, url_a, text_b, title_b, url_b)
    full_prompt = SYSTEM_PROMPT + "\n\n" + prompt

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    payload = {
        "contents": [{"parts": [{"text": full_prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        res = await client.post(endpoint, json=payload)
        res.raise_for_status()
        data = res.json()

    try:
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise ValueError(f"Unexpected Gemini response structure: {data}") from exc

    return _parse_llm_json(raw_text)


async def call_openai(
    text_a: str, title_a: str, url_a: str,
    text_b: str, title_b: str, url_b: str,
    api_key: str,
    model: str = DEFAULT_OPENAI_MODEL,
) -> CompareResponse:
    """Call OpenAI Chat Completions API for structured analysis."""
    user_prompt = _build_user_prompt(text_a, title_a, url_a, text_b, title_b, url_b)

    endpoint = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        res = await client.post(endpoint, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()

    try:
        raw_text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise ValueError(f"Unexpected OpenAI response structure: {data}") from exc

    return _parse_llm_json(raw_text)


async def call_anthropic(
    text_a: str, title_a: str, url_a: str,
    text_b: str, title_b: str, url_b: str,
    api_key: str,
    model: str = DEFAULT_ANTHROPIC_MODEL,
) -> CompareResponse:
    """Call Anthropic Messages API for structured analysis."""
    user_prompt = _build_user_prompt(text_a, title_a, url_a, text_b, title_b, url_b)

    endpoint = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": 2048,
        "temperature": 0.1,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}],
    }

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        res = await client.post(endpoint, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()

    try:
        raw_text = data["content"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise ValueError(f"Unexpected Anthropic response structure: {data}") from exc

    return _parse_llm_json(raw_text)


# ---------------------------------------------------------------------------
# Source-evaluation prompt
# ---------------------------------------------------------------------------

SOURCE_EVAL_SYSTEM = """\
You are a source-evaluation assistant for ContextLens.

Given a claim and a search result snippet, determine whether the source is
relevant to the claim and how it relates to it.

Return ONLY valid JSON (no markdown fences):
{
  "relationship_to_claim": "supports | contradicts | contextualizes | unclear",
  "relevance_reason": "One-sentence explanation grounded in the snippet text.",
  "limitations": "One-sentence note on what the snippet does not cover (or empty string)."
}
"""


async def evaluate_source_relevance(
    claim_text: str,
    source_title: str,
    source_snippet: str,
    api_key: str,
    provider: str,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Use the configured LLM to assess whether a source snippet is relevant
    to a claim. Returns a dict with relationship_to_claim, relevance_reason,
    and limitations.
    """
    user_msg = (
        f'CLAIM: """{claim_text[:1000]}"""\n\n'
        f'SOURCE TITLE: {source_title}\n'
        f'SNIPPET: """{source_snippet[:1000]}"""\n\n'
        f"Assess relevance and return JSON."
    )

    raw: Optional[str] = None

    try:
        if provider == "gemini":
            full = SOURCE_EVAL_SYSTEM + "\n\n" + user_msg
            endpoint = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model or DEFAULT_GEMINI_MODEL}:generateContent?key={api_key}"
            )
            payload = {
                "contents": [{"parts": [{"text": full}]}],
                "generationConfig": {"temperature": 0.0, "responseMimeType": "application/json"},
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(endpoint, json=payload)
                res.raise_for_status()
                raw = res.json()["candidates"][0]["content"]["parts"][0]["text"]

        elif provider == "openai":
            endpoint = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "model": model or DEFAULT_OPENAI_MODEL,
                "temperature": 0.0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": SOURCE_EVAL_SYSTEM},
                    {"role": "user", "content": user_msg},
                ],
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(endpoint, headers=headers, json=payload)
                res.raise_for_status()
                raw = res.json()["choices"][0]["message"]["content"]

        elif provider == "anthropic":
            endpoint = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": model or DEFAULT_ANTHROPIC_MODEL,
                "max_tokens": 256,
                "temperature": 0.0,
                "system": SOURCE_EVAL_SYSTEM,
                "messages": [{"role": "user", "content": user_msg}],
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(endpoint, headers=headers, json=payload)
                res.raise_for_status()
                raw = res.json()["content"][0]["text"]

    except Exception as exc:
        logger.warning("Source evaluation LLM call failed: %s", exc)
        return {
            "relationship_to_claim": "unclear",
            "relevance_reason": "Could not assess relevance (LLM evaluation failed).",
            "limitations": "",
        }

    if not raw:
        return {
            "relationship_to_claim": "unclear",
            "relevance_reason": "No evaluation returned.",
            "limitations": "",
        }

    try:
        result = json.loads(_clean_json(raw))
        # Normalise relationship value
        rel = result.get("relationship_to_claim", "unclear")
        if rel not in ("supports", "contradicts", "contextualizes", "unclear"):
            rel = "unclear"
        return {
            "relationship_to_claim": rel,
            "relevance_reason": str(result.get("relevance_reason", ""))[:500],
            "limitations": str(result.get("limitations", ""))[:300],
        }
    except (json.JSONDecodeError, KeyError):
        return {
            "relationship_to_claim": "unclear",
            "relevance_reason": "Could not parse evaluation response.",
            "limitations": "",
        }
