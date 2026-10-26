import os
import logging
from typing import Optional
from fastapi import FastAPI, Header, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .models import CompareRequest, CompareResponse, ClaimItem, SourceItem
from .analyzer import analyze_passages
from .llm_provider import get_configured_provider_name, LLMConfigurationError
from .source_search import search_sources, generate_search_query
from .source_evaluator import filter_and_rank_sources

# Load environment variables from .env
load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("contextlens.main")

app = FastAPI(
    title="ContextLens API",
    description="Backend service for comparing claims and evidence across web sources using LangChain.",
    version="1.1.0"
)

# Configure CORS to allow Chrome extension and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    provider = get_configured_provider_name()
    search_provider = os.getenv("SEARCH_PROVIDER", "duckduckgo")
    return {
        "project": "ContextLens",
        "tagline": "Don't just read information. Understand its context.",
        "documentation": "/docs",
        "endpoints": ["/compare", "/search-sources", "/health", "/demos"],
        "pipeline": "LangChain Semantic Comparison",
        "llm_provider": provider,
        "search_provider": search_provider
    }

@app.get("/health")
def health_check():
    provider = get_configured_provider_name()
    has_gemini = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))

    engine_display = {
        "gemini": "Google Gemini (via LangChain)",
        "openai": "OpenAI (via LangChain)",
        "anthropic": "Anthropic Claude (via LangChain)",
        "heuristic": "Built-in ContextLens Engine (Offline Heuristic)"
    }.get(provider, f"{provider.capitalize()} (via LangChain)")

    search_provider = os.getenv("SEARCH_PROVIDER", "duckduckgo")

    return {
        "status": "ok",
        "service": "ContextLens Backend",
        "engine": engine_display,
        "llm_provider": provider,
        "llm_configured": has_gemini or has_openai or has_anthropic,
        "search_provider": search_provider
    }

@app.get("/demos")
def get_demo_scenarios():
    return {
        "scenarios": [
            {
                "id": "contradiction",
                "name": "Scenario A: Possible Contradiction",
                "description": "Mutually exclusive conference dates.",
                "claim_a": {
                    "text": "The DevSummit 2026 opening keynote takes place on Friday, November 14th at 9:00 AM.",
                    "title": "TechNews Daily - DevSummit Preview",
                    "url": "https://technewsdaily.mock/devsummit-preview"
                },
                "claim_b": {
                    "text": "All main conference talks including the opening keynote are confirmed for Saturday, November 15th.",
                    "title": "EventHub Official - DevSummit Schedule",
                    "url": "https://eventhub.mock/devsummit-official"
                }
            },
            {
                "id": "different_context",
                "name": "Scenario B: Different Context",
                "description": "Base retail price vs final checkout total with tax and delivery.",
                "claim_a": {
                    "text": "The ZenBook Ultra is listed starting at $499 on the manufacturer product page.",
                    "title": "HardwareDigest - Ultra Price Specs",
                    "url": "https://hardwaredigest.mock/zenbook-review"
                },
                "claim_b": {
                    "text": "The total order came to $549 for the ZenBook Ultra at checkout with shipping and taxes.",
                    "title": "Buyer Forum - ZenBook Checkout Experience",
                    "url": "https://buyerforum.mock/zenbook-order-549"
                }
            },
            {
                "id": "insufficient_context",
                "name": "Scenario C: Insufficient Context",
                "description": "Contrasting youth employment figures without region, year, or age brackets.",
                "claim_a": {
                    "text": "Youth unemployment increased by 3.8% reaching record levels in the latest quarterly survey.",
                    "title": "Economic Monitor - Youth Labor Trends",
                    "url": "https://econmonitor.mock/youth-jobs-report"
                },
                "claim_b": {
                    "text": "Youth joblessness dropped to an all-time low of 7.2% as new tech internships surged.",
                    "title": "Global Career Insights - Talent Snapshot",
                    "url": "https://careerinsights.mock/labor-statistics"
                }
            }
        ]
    }

@app.get("/search-sources")
async def search_evidence_sources(
    q: str = Query(..., min_length=3, description="Search query or claim text"),
    max_results: int = Query(default=3, ge=1, le=10)
):
    """Discovers external web sources relevant to a claim."""
    try:
        query = generate_search_query(q)
        raw_sources = await search_sources(query, max_results=max_results)
        evaluated = filter_and_rank_sources(q, raw_sources, top_k=max_results)
        return {"query": query, "sources": evaluated}
    except Exception as e:
        logger.error(f"Search endpoint error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Source search failed: {str(e)}"
        )

@app.post("/compare", response_model=CompareResponse)
async def compare_claims(
    req: CompareRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    # Input validation
    text_a = req.claim_a.text.strip()
    text_b = req.claim_b.text.strip() if req.claim_b else ""

    if not text_a:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source A (Claim) text cannot be empty."
        )

    # When claim_b is provided, it cannot be empty or too short
    if req.claim_b is not None:
        if not text_b:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Source B (Evidence) text cannot be empty."
            )
        if len(text_b) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Both passages must contain at least 5 characters for meaningful comparison."
            )

    if len(text_a) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both passages must contain at least 5 characters for meaningful comparison."
        )

    title_b = req.claim_b.title if req.claim_b else "External Discovery"
    logger.info(f"Comparing Source A ('{req.claim_a.title}') with Source B ('{title_b}')")

    try:
        response = await analyze_passages(
            claim_a=req.claim_a,
            claim_b=req.claim_b,
            api_key_override=x_api_key,
            include_search=req.include_search,
            max_search_results=req.max_search_results
        )
        return response
    except LLMConfigurationError as cfg_err:
        logger.error(f"Configuration error: {cfg_err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"AI Provider Configuration Error: {str(cfg_err)}"
        )
    except ValueError as val_err:
        logger.error(f"Validation error during comparison: {val_err}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Error during comparison: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison failed: {str(e)}"
        )
