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
from dotenv import load_dotenv

load_dotenv()
_backend_env = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_backend_env):
    load_dotenv(_backend_env)

from .models import CompareResponse
from .guardrails import (
    repair_and_parse_json,
    format_guarded_prompt,
    apply_input_guardrails,
    apply_output_guardrails,
)

logger = logging.getLogger("contextlens.llm_provider")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DEFAULT_LOCAL_MODEL   = os.getenv("LOCAL_MODEL",   os.getenv("OLLAMA_MODEL", "qwen2.5:latest"))
LOCAL_LLM_URL         = os.getenv("LOCAL_LLM_URL", os.getenv("OLLAMA_HOST",  "http://localhost:11434")).rstrip("/")

DEFAULT_GEMINI_MODEL  = os.getenv("GEMINI_MODEL",    "gemini-3.8-flash")
DEFAULT_GROQ_MODEL    = os.getenv("GROQ_MODEL",      "openai/gpt-oss-120b")
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
  SUPPORTED             – Passage B confirms and substantiates the core claim of Passage A. Passage A MUST contain an explicit factual assertion that is corroborated by Passage B.
  CONTRADICTED          – reliable evidence directly conflicts with the claim under
                          comparable conditions (same entity, scope, timeframe)
  PARTIALLY_SUPPORTED   – some aspects of the claim are supported, but the full
                          claim is not established by the evidence
  DIFFERENT_CONTEXT     – passages differ because of dates, scope, definitions,
                          conditions, or measurement methods
  INSUFFICIENT_EVIDENCE – the evidence does not provide enough information to
                          assess the claim, OR Passage A does not contain an evaluable factual assertion (e.g. Passage A is merely a noun, entity name, topic title, or incomplete fragment such as 'Mount Fuji'). A bare topic or noun phrase alone cannot be classified as SUPPORTED or CONTRADICTED.
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


def _parse_llm_json(
    raw: str,
    passage_a: str = "",
    passage_b: str = "",
) -> CompareResponse:
    """Parse raw LLM output to CompareResponse, with resilient field handling and guardrails."""
    data = repair_and_parse_json(raw)
    if not data:
        cleaned = _clean_json(raw)
        try:
            data = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise ValueError(f"LLM returned invalid JSON: {exc}\nRaw output: {raw[:500]}") from exc

    # Map legacy field names that the model might output
    if "explanation" in data and "analysis_summary" not in data:
        data["analysis_summary"] = data["explanation"]
    if "analysis_summary" in data and "explanation" not in data:
        data["explanation"] = data["analysis_summary"]

    if passage_a or passage_b:
        guarded_dict, applied, warnings = apply_output_guardrails(data, passage_a, passage_b)
        guarded_dict["guardrails_applied"] = applied
        guarded_dict["guardrail_warnings"] = warnings
        data = guarded_dict
    else:
        # Clamp confidence
        if "confidence" in data:
            try:
                conf = float(data["confidence"])
                data["confidence"] = max(0.0, min(1.0, conf))
            except (TypeError, ValueError):
                data["confidence"] = None

    if "engine" not in data:
        data["engine"] = "llm"

    try:
        return CompareResponse(**data)
    except Exception as exc:
        raise ValueError(f"LLM response failed schema validation: {exc}") from exc


# ---------------------------------------------------------------------------
# Provider implementations
# ---------------------------------------------------------------------------

async def call_local_model(
    text_a: str,
    title_a: str,
    url_a: str,
    text_b: str,
    title_b: str,
    url_b: str,
    model: str = DEFAULT_LOCAL_MODEL,
    base_url: str = LOCAL_LLM_URL,
) -> CompareResponse:
    """
    Call a local LLM runner (Ollama, LM Studio, vLLM, llama.cpp) running local models like Qwen.
    Requires NO API keys. Enforces strict input and output guardrails.
    """
    # Guardrail 1: Input boundary isolation & prompt injection sanitization
    clean_a, clean_b, guarded_prompt, input_applied, input_warnings = apply_input_guardrails(
        claim_a_text=text_a,
        claim_a_title=title_a,
        claim_b_text=text_b,
        claim_b_title=title_b,
        max_chars=MAX_INPUT_CHARS,
    )

    url_norm = base_url.rstrip("/")
    raw_text: Optional[str] = None
    last_error: Optional[Exception] = None

    async with httpx.AsyncClient(timeout=LLM_TIMEOUT) as client:
        # Strategy A: Native Ollama /api/chat endpoint
        if not url_norm.endswith("/v1"):
            ollama_endpoint = f"{url_norm}/api/chat"
            ollama_payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": guarded_prompt},
                ],
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.1,
                },
            }
            try:
                res = await client.post(ollama_endpoint, json=ollama_payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_text = data.get("message", {}).get("content", "")
                elif res.status_code != 404:
                    res.raise_for_status()
            except (httpx.ConnectError, httpx.TimeoutException) as exc:
                raise exc
            except Exception as exc:
                last_error = exc
                logger.debug("Ollama /api/chat failed: %s; trying /v1/chat/completions...", exc)

        # Strategy B: OpenAI-compatible endpoint (LM Studio, vLLM, Ollama /v1)
        if raw_text is None:
            endpoint = (
                f"{url_norm}/chat/completions"
                if url_norm.endswith("/v1")
                else f"{url_norm}/v1/chat/completions"
            )
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": guarded_prompt},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0.1,
            }
            try:
                res = await client.post(endpoint, json=payload)
                res.raise_for_status()
                data = res.json()
                raw_text = data["choices"][0]["message"]["content"]
            except Exception as exc:
                if last_error:
                    raise ValueError(f"Local model call failed on both Ollama and /v1 endpoints: {exc}") from exc
                raise exc

    if not raw_text:
        raise ValueError(f"No response text received from local model at {base_url}")

    # Guardrail 2: JSON Repair & parsing
    parsed = repair_and_parse_json(raw_text)
    if not parsed:
        raise ValueError(f"Local model returned invalid JSON:\n{raw_text[:500]}")

    if "explanation" in parsed and "analysis_summary" not in parsed:
        parsed["analysis_summary"] = parsed["explanation"]
    if "analysis_summary" in parsed and "explanation" not in parsed:
        parsed["explanation"] = parsed["analysis_summary"]

    # Guardrail 3: Output Guardrails (Taxonomy, Grounding, Anti-Hallucination, Confidence Calibration)
    guarded_dict, output_applied, output_warnings = apply_output_guardrails(
        data=parsed,
        passage_a=clean_a,
        passage_b=clean_b,
    )

    guarded_dict["engine"] = f"local-qwen ({model})"
    guarded_dict["evidence_a"] = text_a
    guarded_dict["evidence_b"] = text_b
    guarded_dict["guardrails_applied"] = list(dict.fromkeys(input_applied + output_applied))
    guarded_dict["guardrail_warnings"] = list(dict.fromkeys(input_warnings + output_warnings))

    return CompareResponse(**guarded_dict)


call_qwen_local = call_local_model

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
    api_key: str = "",
    provider: str = "local",
    model: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Use the configured LLM (local Qwen or cloud provider) to assess whether a
    source snippet is relevant to a claim. Returns a dict with relationship_to_claim,
    relevance_reason, and limitations.
    Requires NO API keys when using local models.
    """
    user_msg = (
        f'CLAIM: """{claim_text[:1000]}"""\n\n'
        f'SOURCE TITLE: {source_title}\n'
        f'SNIPPET: """{source_snippet[:1000]}"""\n\n'
        f"Assess relevance and return JSON."
    )

    raw: Optional[str] = None

    try:
        if provider in ("local", "qwen"):
            url_norm = LOCAL_LLM_URL.rstrip("/")
            async with httpx.AsyncClient(timeout=10.0) as client:
                if not url_norm.endswith("/v1"):
                    try:
                        res = await client.post(
                            f"{url_norm}/api/chat",
                            json={
                                "model": model or DEFAULT_LOCAL_MODEL,
                                "messages": [
                                    {"role": "system", "content": SOURCE_EVAL_SYSTEM},
                                    {"role": "user", "content": user_msg},
                                ],
                                "format": "json",
                                "stream": False,
                                "options": {"temperature": 0.0},
                            },
                        )
                        if res.status_code == 200:
                            raw = res.json().get("message", {}).get("content", "")
                    except Exception:
                        pass
                if not raw:
                    endpoint = (
                        f"{url_norm}/chat/completions"
                        if url_norm.endswith("/v1")
                        else f"{url_norm}/v1/chat/completions"
                    )
                    res = await client.post(
                        endpoint,
                        json={
                            "model": model or DEFAULT_LOCAL_MODEL,
                            "temperature": 0.0,
                            "response_format": {"type": "json_object"},
                            "messages": [
                                {"role": "system", "content": SOURCE_EVAL_SYSTEM},
                                {"role": "user", "content": user_msg},
                            ],
                        },
                    )
                    if res.status_code == 200:
                        raw = res.json()["choices"][0]["message"]["content"]

        elif provider == "gemini":
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


# ---------------------------------------------------------------------------
# LangChain Model Factory Integration
# ---------------------------------------------------------------------------

class LLMConfigurationError(Exception):
    """Raised when an AI provider is requested but its required credentials/configuration are missing."""
    pass


def get_configured_provider_name() -> str:
    """
    Returns the explicitly configured LLM provider name from the LLM_PROVIDER
    environment variable, or auto-detects based on available API keys if not specified.
    """
    explicit = os.getenv("LLM_PROVIDER", "").strip().lower()
    if explicit:
        return explicit

    # Auto-detection priority if LLM_PROVIDER is not set
    if os.getenv("GROQ_API_KEY"):
        return "groq"
    if os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        return "gemini"
    if os.getenv("GROQ_API_KEY"):
        return "groq"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("ANTHROPIC_API_KEY"):
        return "anthropic"

    return "heuristic"


def get_llm_model(
    api_key_override: Optional[str] = None,
    provider_override: Optional[str] = None
):
    """
    Initializes and returns the configured LangChain BaseChatModel instance and provider name.
    
    If the selected provider is missing credentials, raises LLMConfigurationError.
    If no provider is configured at all, returns (None, "heuristic").
    Does NOT silently switch to another provider if the configured provider has missing credentials.
    """
    provider = (provider_override or get_configured_provider_name()).lower()
    
    # Check for provider key overrides
    override_provider = None
    if api_key_override:
        if api_key_override.startswith("gsk_"):
            override_provider = "groq"
        elif api_key_override.startswith("sk-ant-"):
            override_provider = "anthropic"
        elif api_key_override.startswith("gsk_"):
            override_provider = "groq"
        elif api_key_override.startswith("sk-"):
            override_provider = "openai"
        elif api_key_override.startswith("AIza") or api_key_override.startswith("AQ.") or len(api_key_override) > 20:
            override_provider = "gemini"
            
    if override_provider and not provider_override:
        provider = override_provider

    temperature = float(os.getenv("LLM_TEMPERATURE", "0.0"))

    # 1. Google Gemini
    if provider in ("gemini", "google", "google-genai"):
        gemini_key = None
        if api_key_override and not api_key_override.startswith("gsk_") and not api_key_override.startswith("sk-"):
            gemini_key = api_key_override
        gemini_key = gemini_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not gemini_key:
            raise LLMConfigurationError(
                "LLM provider is set to 'gemini', but neither GEMINI_API_KEY nor GOOGLE_API_KEY is configured in the environment."
            )
        model_name = os.getenv("LLM_MODEL") or os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            chat_model = ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=gemini_key,
                temperature=temperature,
                max_retries=2,
                request_timeout=25.0
            )
            return chat_model, "gemini"
        except ImportError as e:
            raise LLMConfigurationError(f"langchain_google_genai is not installed: {e}")

    # 2. Groq (Fast Cloud Inference)
    elif provider in ("groq", "groq-cloud"):
        groq_key = None
        if api_key_override and (api_key_override.startswith("gsk_") or provider in ("groq", "groq-cloud")):
            groq_key = api_key_override
        groq_key = groq_key or os.getenv("GROQ_API_KEY")
        if not groq_key:
            raise LLMConfigurationError(
                "LLM provider is set to 'groq', but GROQ_API_KEY is not configured in the environment."
            )
        model_name = os.getenv("LLM_MODEL") or os.getenv("GROQ_MODEL") or DEFAULT_GROQ_MODEL
        try:
            from langchain_groq import ChatGroq
            chat_model = ChatGroq(
                model=model_name,
                api_key=groq_key,
                temperature=temperature,
                max_retries=2,
                timeout=25.0
            )
            return chat_model, "groq"
        except ImportError as e:
            raise LLMConfigurationError(f"langchain_groq is not installed: {e}")

    # 3. OpenAI
    elif provider in ("openai", "gpt"):
        openai_key = api_key_override or os.getenv("OPENAI_API_KEY")
        if not openai_key:
            raise LLMConfigurationError(
                "LLM provider is set to 'openai', but OPENAI_API_KEY is not configured in the environment."
            )
        model_name = os.getenv("LLM_MODEL") or os.getenv("OPENAI_MODEL") or DEFAULT_OPENAI_MODEL
        try:
            from langchain_openai import ChatOpenAI
            chat_model = ChatOpenAI(
                model=model_name,
                api_key=openai_key,
                temperature=temperature,
                max_retries=2,
                request_timeout=25.0
            )
            return chat_model, "openai"
        except ImportError as e:
            raise LLMConfigurationError(f"langchain_openai is not installed: {e}")

    # 4. Anthropic Claude
    elif provider in ("anthropic", "claude"):
        anthropic_key = api_key_override or os.getenv("ANTHROPIC_API_KEY")
        if not anthropic_key:
            raise LLMConfigurationError(
                "LLM provider is set to 'anthropic', but ANTHROPIC_API_KEY is not configured in the environment."
            )
        model_name = os.getenv("LLM_MODEL") or os.getenv("ANTHROPIC_MODEL") or DEFAULT_ANTHROPIC_MODEL
        try:
            from langchain_anthropic import ChatAnthropic
            chat_model = ChatAnthropic(
                model_name=model_name,
                api_key=anthropic_key,
                temperature=temperature,
                max_retries=2,
                timeout=25.0
            )
            return chat_model, "anthropic"
        except ImportError as e:
            raise LLMConfigurationError(f"langchain_anthropic is not installed: {e}")

    # 5. Local Model Runner (Qwen / Ollama / LM Studio)
    elif provider in ("local", "qwen", "ollama"):
        return None, "local"

    # 6. Built-in Deterministic Heuristic Engine
    elif provider in ("heuristic", "builtin", "none", ""):
        return None, "heuristic"

    else:
        raise LLMConfigurationError(
            f"Unsupported LLM_PROVIDER '{provider}'. Supported options are: 'gemini', 'groq', 'openai', 'anthropic', 'heuristic', 'local'."
        )

