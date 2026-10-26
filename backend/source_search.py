import os
import re
import logging
from typing import List, Optional, Dict, Any
import httpx
from bs4 import BeautifulSoup

from .models import SourceItem

logger = logging.getLogger("contextlens.source_search")

# Safety caps
MAX_SNIPPET_LENGTH = 1500
MAX_PAGE_FETCH_BYTES = 500_000
FETCH_TIMEOUT_SECONDS = 5.0

def generate_search_query(claim_text: str, missing_context: Optional[List[str]] = None) -> str:
    """
    Constructs a concise, focused search query from the claim text and missing context.
    Avoids punctuation noise and focuses on key entities and terms.
    """
    clean_text = re.sub(r'[^\w\s\$\%\.\-]', ' ', claim_text)
    words = clean_text.split()
    
    # Take key informative words (up to 8-10 words)
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
    
    # If missing context points to a specific year or location, add it
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
    Supported providers:
    - 'duckduckgo': Default offline/online search with no API key needed.
    - 'tavily': High-accuracy research search when TAVILY_API_KEY is configured.
    - 'mock': Deterministic mock search for unit testing.
    """
    provider_name = (provider or os.getenv("SEARCH_PROVIDER", "duckduckgo")).lower()
    tavily_key = os.getenv("TAVILY_API_KEY")

    if provider_name == "tavily" or (tavily_key and provider_name != "duckduckgo"):
        return await _search_tavily(query, max_results, tavily_key)
    elif provider_name == "mock":
        return _search_mock(query, max_results)
    else:
        return await _search_duckduckgo(query, max_results)


async def _search_duckduckgo(query: str, max_results: int = 3) -> List[SourceItem]:
    """Retrieves web search snippets via duckduckgo_search without fabricating any data."""
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
    """Retrieves search results via Tavily API."""
    key = api_key or os.getenv("TAVILY_API_KEY")
    if not key:
        logger.warning("Tavily API key missing; falling back to DuckDuckGo search.")
        return await _search_duckduckgo(query, max_results)

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
        return await _search_duckduckgo(query, max_results)


def _search_mock(query: str, max_results: int = 3) -> List[SourceItem]:
    """Returns fixed mock sources for predictable testing without live network calls."""
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
    """
    Safely retrieves the readable text of a webpage up to MAX_PAGE_FETCH_BYTES.
    Treats the webpage content as untrusted data.
    Returns None if fetching fails or times out.
    """
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
            
            # Remove scripts, styles, nav, and ads
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            text = soup.get_text(separator=" ", strip=True)
            # Truncate to reasonable token limit
            return text[:4000] if text else None
    except Exception as e:
        logger.debug(f"Could not fetch full content from {url}: {e}")
        return None
