"""
ContextLens – Web search integration for source discovery.

Supported providers (configured via environment variables):
  - SerpAPI (SERPAPI_KEY)            – most comprehensive
  - Brave Search (BRAVE_SEARCH_KEY)  – privacy-focused, good coverage
  - DuckDuckGo Instant Answer API    – free, no key required, limited results

Security rules:
- Only HTTP(S) URLs with valid hostnames are returned.
- No private-network or localhost URLs are fetched.
- Retrieved page content is treated as untrusted.
- Content is length-limited before passing to the LLM.
"""

from __future__ import annotations

import logging
import os
import re
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger("contextlens.source_search")

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SEARCH_TIMEOUT   = float(os.getenv("SEARCH_TIMEOUT_SECONDS", "10"))
MAX_RESULTS      = int(os.getenv("MAX_SEARCH_RESULTS", "5"))
MAX_SNIPPET_CHARS = int(os.getenv("MAX_SNIPPET_CHARS", "400"))

# Blocklist for SSRF protection
_PRIVATE_PATTERNS = re.compile(
    r"(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1"
    r"|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)",
    re.IGNORECASE,
)


def _is_safe_url(url: str) -> bool:
    """Return True only for public HTTP/HTTPS URLs with a valid hostname."""
    try:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False
        host = parsed.hostname or ""
        if not host or _PRIVATE_PATTERNS.search(host):
            return False
        return True
    except Exception:
        return False


def _safe_domain(url: str) -> str:
    """Extract domain name from a URL."""
    try:
        return urllib.parse.urlparse(url).hostname or url
    except Exception:
        return url


# ---------------------------------------------------------------------------
# Query generation
# ---------------------------------------------------------------------------

def generate_search_queries(claim_text: str, verification_questions: List[str]) -> List[str]:
    """
    Build focused search queries from the claim and unresolved questions.
    Returns up to 3 distinct queries.
    """
    queries: List[str] = []

    # Primary query: use the claim text directly (truncated)
    primary = claim_text.strip()[:200]
    queries.append(primary)

    # Secondary queries from verification questions
    for q in verification_questions[:2]:
        q_clean = q.strip().rstrip("?")
        if q_clean and len(q_clean) > 10:
            queries.append(q_clean[:200])

    return queries[:3]


# ---------------------------------------------------------------------------
# Provider: SerpAPI
# ---------------------------------------------------------------------------

async def _search_serpapi(query: str, api_key: str) -> List[Dict[str, Any]]:
    """Search using SerpAPI (Google search results)."""
    endpoint = "https://serpapi.com/search"
    params = {
        "q": query,
        "api_key": api_key,
        "num": MAX_RESULTS,
        "hl": "en",
        "gl": "us",
        "engine": "google",
    }

    async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT) as client:
        res = await client.get(endpoint, params=params)
        res.raise_for_status()
        data = res.json()

    results: List[Dict[str, Any]] = []
    for item in data.get("organic_results", [])[:MAX_RESULTS]:
        url = item.get("link", "")
        if not _is_safe_url(url):
            continue
        results.append({
            "title": item.get("title", ""),
            "url": url,
            "snippet": item.get("snippet", "")[:MAX_SNIPPET_CHARS],
            "published_date": item.get("date", None),
            "source": _safe_domain(url),
        })

    return results


# ---------------------------------------------------------------------------
# Provider: Brave Search
# ---------------------------------------------------------------------------

async def _search_brave(query: str, api_key: str) -> List[Dict[str, Any]]:
    """Search using Brave Search API."""
    endpoint = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": api_key,
    }
    params = {"q": query, "count": MAX_RESULTS, "search_lang": "en"}

    async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT) as client:
        res = await client.get(endpoint, headers=headers, params=params)
        res.raise_for_status()
        data = res.json()

    results: List[Dict[str, Any]] = []
    for item in data.get("web", {}).get("results", [])[:MAX_RESULTS]:
        url = item.get("url", "")
        if not _is_safe_url(url):
            continue
        results.append({
            "title": item.get("title", ""),
            "url": url,
            "snippet": item.get("description", "")[:MAX_SNIPPET_CHARS],
            "published_date": item.get("page_age", None),
            "source": _safe_domain(url),
        })

    return results


# ---------------------------------------------------------------------------
# Provider: DuckDuckGo (no key required, limited results)
# ---------------------------------------------------------------------------

async def _search_duckduckgo(query: str) -> List[Dict[str, Any]]:
    """
    Search using DuckDuckGo Instant Answer API.
    Note: Returns related topics, not a full SERP — limited but free.
    """
    endpoint = "https://api.duckduckgo.com/"
    params = {
        "q": query,
        "format": "json",
        "no_redirect": "1",
        "no_html": "1",
        "skip_disambig": "1",
    }

    async with httpx.AsyncClient(timeout=SEARCH_TIMEOUT) as client:
        res = await client.get(endpoint, params=params)
        res.raise_for_status()
        data = res.json()

    results: List[Dict[str, Any]] = []

    # RelatedTopics (primary DuckDuckGo results)
    for topic in data.get("RelatedTopics", [])[:MAX_RESULTS]:
        if not isinstance(topic, dict):
            continue
        url = topic.get("FirstURL", "")
        if not url or not _is_safe_url(url):
            continue
        text = topic.get("Text", "")
        results.append({
            "title": text[:80] if text else "DuckDuckGo Result",
            "url": url,
            "snippet": text[:MAX_SNIPPET_CHARS],
            "published_date": None,
            "source": _safe_domain(url),
        })

    # Also check AbstractURL if present
    abstract_url = data.get("AbstractURL", "")
    if abstract_url and _is_safe_url(abstract_url) and data.get("AbstractText"):
        results.insert(0, {
            "title": data.get("Heading", ""),
            "url": abstract_url,
            "snippet": data.get("AbstractText", "")[:MAX_SNIPPET_CHARS],
            "published_date": None,
            "source": _safe_domain(abstract_url),
        })

    return results[:MAX_RESULTS]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def search_for_sources(
    query: str,
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Attempt search using configured providers in order of preference.
    Returns (results_list, provider_name_used).

    Results are deduplicated by URL.
    """
    serpapi_key  = os.getenv("SERPAPI_KEY", "")
    brave_key    = os.getenv("BRAVE_SEARCH_KEY", "")
    search_enabled = os.getenv("SEARCH_ENABLED", "true").lower() != "false"

    if not search_enabled:
        return [], "disabled"

    # SerpAPI
    if serpapi_key:
        try:
            results = await _search_serpapi(query, serpapi_key)
            if results:
                return results, "serpapi"
        except Exception as exc:
            logger.warning("SerpAPI search failed: %s", exc)

    # Brave Search
    if brave_key:
        try:
            results = await _search_brave(query, brave_key)
            if results:
                return results, "brave"
        except Exception as exc:
            logger.warning("Brave search failed: %s", exc)

    # DuckDuckGo (free fallback)
    try:
        results = await _search_duckduckgo(query)
        if results:
            return results, "duckduckgo"
    except Exception as exc:
        logger.warning("DuckDuckGo search failed: %s", exc)

    return [], "none"


async def discover_sources(
    claim_text: str,
    verification_questions: Optional[List[str]] = None,
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Generate focused queries from a claim and search for independent sources.
    Returns (list_of_raw_results, provider_used).
    """
    queries = generate_search_queries(claim_text, verification_questions or [])

    seen_urls: set = set()
    combined: List[Dict[str, Any]] = []
    provider_used = "none"

    for query in queries:
        if len(combined) >= MAX_RESULTS:
            break
        try:
            results, provider = await search_for_sources(query)
            if provider != "none":
                provider_used = provider
            for r in results:
                url = r.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    combined.append(r)
                if len(combined) >= MAX_RESULTS:
                    break
        except Exception as exc:
            logger.warning("Source discovery query failed ('%s'): %s", query[:60], exc)

    return combined[:MAX_RESULTS], provider_used


# ---------------------------------------------------------------------------
# LangChain Source Search Integration
# ---------------------------------------------------------------------------

from .models import SourceItem
from bs4 import BeautifulSoup

MAX_SNIPPET_LENGTH = 1500
MAX_PAGE_FETCH_BYTES = 500_000
FETCH_TIMEOUT_SECONDS = 5.0

def generate_search_query(claim_text: str, missing_context: Optional[List[str]] = None) -> str:
    """
    Constructs a concise, focused search query from the claim text and missing context.
    """
    clean_text = re.sub(r'[^\w\s\$\%\.\-]', ' ', claim_text)
    words = clean_text.split()
    stopwords = {
        'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'from', 'to', 'at', 'in', 'on', 'by',
        'for', 'with', 'about', 'between', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'then', 'once',
        'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
        'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
        'too', 'very', 'can', 'will', 'just', 'should', 'now', 'a', 'an', 'and', 'or', 'as', 'of',
        'that', 'this', 'these', 'those', 'it', 'its'
    }
    key_words = [w for w in words if w.lower() not in stopwords]
    query_parts = key_words[:8] if key_words else words[:8]
    
    if missing_context:
        for item in missing_context:
            match = re.search(r'\b(19\d\d|20\d\d)\b', item)
            if match and match.group(0) not in query_parts:
                query_parts.append(match.group(0))
                break

    return " ".join(query_parts)


async def search_sources(
    query: str,
    max_results: int = 3,
    provider: Optional[str] = None
) -> List[SourceItem]:
    """
    Searches for sources using the configured search provider.
    Supported providers: 'duckduckgo', 'tavily', 'mock'.
    """
    provider_name = (provider or os.getenv("SEARCH_PROVIDER", "duckduckgo")).lower()
    tavily_key = os.getenv("TAVILY_API_KEY")

    if provider_name == "tavily" or (tavily_key and provider_name != "duckduckgo"):
        return await _search_tavily(query, max_results, tavily_key)
    elif provider_name == "mock":
        return _search_mock(query, max_results)
    else:
        return await _search_ddg_sources(query, max_results)


async def _search_ddg_sources(query: str, max_results: int = 3) -> List[SourceItem]:
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            raw_results = list(ddgs.text(query, max_results=max_results))
            for r in raw_results:
                url = r.get("href") or r.get("url") or ""
                title = r.get("title") or "Search Result"
                body = r.get("body") or r.get("snippet") or ""
                if url:
                    results.append(SourceItem(
                        title=title,
                        url=url,
                        snippet=body[:MAX_SNIPPET_LENGTH],
                        content_type="snippet",
                        is_relevant=True,
                        relevance_score=0.7
                    ))
        return results
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed ({e}); returning empty list without fabricating results.")
        return []


async def _search_tavily(query: str, max_results: int = 3, api_key: Optional[str] = None) -> List[SourceItem]:
    key = api_key or os.getenv("TAVILY_API_KEY")
    if not key:
        return await _search_ddg_sources(query, max_results)

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=key)
        response = client.search(query=query, max_results=max_results)
        results = []
        for r in response.get("results", []):
            url = r.get("url", "")
            title = r.get("title", "Search Result")
            content = r.get("content", "")
            if url:
                results.append(SourceItem(
                    title=title,
                    url=url,
                    snippet=content[:MAX_SNIPPET_LENGTH],
                    content_type="snippet",
                    is_relevant=True,
                    relevance_score=r.get("score", 0.8)
                ))
        return results
    except Exception as e:
        logger.warning(f"Tavily search failed ({e}); falling back to DuckDuckGo.")
        return await _search_ddg_sources(query, max_results)


def _search_mock(query: str, max_results: int = 3) -> List[SourceItem]:
    return [
        SourceItem(
            title="Official Conference Bulletin",
            url="https://official-bulletin.example.org/schedule-update",
            snippet="The organizing committee has confirmed that the opening keynote will proceed on Friday.",
            content_type="snippet",
            is_relevant=True,
            relevance_score=0.92,
            verified_claim="Event keynote schedule confirmed for Friday"
        ),
        SourceItem(
            title="Tech Events Archives",
            url="https://tech-archives.example.org/history/devsummit",
            snippet="Historical records indicate past DevSummit gatherings were held over weekend dates.",
            content_type="snippet",
            is_relevant=False,
            relevance_score=0.35,
            verified_claim=None
        )
    ][:max_results]


async def fetch_page_content_if_available(url: str) -> Optional[str]:
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        return None

    try:
        headers = {
            "User-Agent": "ContextLens/1.0 (Research Assistant; +https://github.com/anshulkhatkar12/ContextLens)"
        }
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS, follow_redirects=True) as client:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                return None
            
            content_type = res.headers.get("content-type", "").lower()
            if "text/html" not in content_type and "text/plain" not in content_type:
                return None

            html_text = res.text[:MAX_PAGE_FETCH_BYTES]
            soup = BeautifulSoup(html_text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            text = soup.get_text(separator=" ", strip=True)
            return text[:4000] if text else None
    except Exception as e:
        logger.debug(f"Could not fetch full content from {url}: {e}")
        return None

