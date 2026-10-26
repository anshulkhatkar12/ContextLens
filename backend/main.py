import os
import logging
from typing import Optional
from fastapi import FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .models import CompareRequest, CompareResponse
from .analyzer import analyze_passages

# Load environment variables from .env
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("contextlens.main")

app = FastAPI(
    title="ContextLens API",
    description=(
        "AI-powered semantic evidence analysis and source discovery backend "
        "for the ContextLens Chrome extension."
    ),
    version="2.0.0",
)

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# Configure CORS to allow Chrome extension and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = exc.errors()
    first_msg = errors[0].get("msg", "Validation error") if errors else "Validation error"
    if first_msg.startswith("Value error, "):
        first_msg = first_msg[len("Value error, "):]
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": first_msg},
    )


@app.get("/")
def read_root():
    return {
        "project": "ContextLens",
        "version": "2.0.0",
        "tagline": "Don't just read information. Understand its context.",
        "documentation": "/docs",
        "endpoints": ["/compare", "/health", "/demos"],
    }


@app.get("/health")
def health_check():
    has_gemini    = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    has_openai    = bool(os.getenv("OPENAI_API_KEY"))
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))
    has_serpapi   = bool(os.getenv("SERPAPI_KEY"))
    has_brave     = bool(os.getenv("BRAVE_SEARCH_KEY"))

    if has_gemini:
        engine_name = "Google Gemini (AI)"
    elif has_openai:
        engine_name = "OpenAI GPT (AI)"
    elif has_anthropic:
        engine_name = "Anthropic Claude (AI)"
    else:
        engine_name = "Heuristic Fallback (no LLM configured)"

    if has_serpapi:
        search_name = "SerpAPI"
    elif has_brave:
        search_name = "Brave Search"
    else:
        search_name = "DuckDuckGo (free fallback)"

    return {
        "status": "ok",
        "service": "ContextLens Backend",
        "api_version": "2.0.0",
        "engine": engine_name,
        "llm_configured": has_gemini or has_openai or has_anthropic,
        "search_engine": search_name,
        "search_configured": has_serpapi or has_brave,
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
                    "url": "https://technewsdaily.mock/devsummit-preview",
                },
                "claim_b": {
                    "text": "All main conference talks including the opening keynote are confirmed for Saturday, November 15th.",
                    "title": "EventHub Official - DevSummit Schedule",
                    "url": "https://eventhub.mock/devsummit-official",
                },
            },
            {
                "id": "different_context",
                "name": "Scenario B: Different Context",
                "description": "Base retail price vs final checkout total with tax and delivery.",
                "claim_a": {
                    "text": "The ZenBook Ultra is listed starting at $499 on the manufacturer product page.",
                    "title": "HardwareDigest - Ultra Price Specs",
                    "url": "https://hardwaredigest.mock/zenbook-review",
                },
                "claim_b": {
                    "text": "The total order came to $549 for the ZenBook Ultra at checkout with shipping and taxes.",
                    "title": "Buyer Forum - ZenBook Checkout Experience",
                    "url": "https://buyerforum.mock/zenbook-order-549",
                },
            },
            {
                "id": "insufficient_context",
                "name": "Scenario C: Insufficient Context",
                "description": "Contrasting youth employment figures without region, year, or age brackets.",
                "claim_a": {
                    "text": "Youth unemployment increased by 3.8% reaching record levels in the latest quarterly survey.",
                    "title": "Economic Monitor - Youth Labor Trends",
                    "url": "https://econmonitor.mock/youth-jobs-report",
                },
                "claim_b": {
                    "text": "Youth joblessness dropped to an all-time low of 7.2% as new tech internships surged.",
                    "title": "Global Career Insights - Talent Snapshot",
                    "url": "https://careerinsights.mock/labor-statistics",
                },
            },
        ]
    }


@app.post("/compare", response_model=CompareResponse)
async def compare_claims(
    req: CompareRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
):
    """
    Compare two text passages using AI-powered semantic analysis.

    - Uses the configured LLM (Gemini / OpenAI / Anthropic) for genuine
      semantic understanding.
    - Falls back to a clearly-labelled heuristic engine if no API key is set.
    - Discovers and evaluates additional sources when a search provider is
      configured.
    - API keys are kept server-side only and never returned in the response.
    """
    text_a = req.claim_a.text.strip()
    text_b = req.claim_b.text.strip()

    if not text_a:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source A (Claim) text cannot be empty.",
        )

    if not text_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source B (Evidence) text cannot be empty.",
        )

    if len(text_a) < 5 or len(text_b) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both passages must contain at least 5 characters for meaningful comparison.",
        )

    # Log titles only (not full passage text) to protect user privacy
    logger.info(
        "Comparing: A='%s' B='%s'",
        req.claim_a.title or "untitled",
        req.claim_b.title or "untitled",
    )

    try:
        response = await analyze_passages(
            req.claim_a,
            req.claim_b,
            api_key_override=x_api_key,
        )
        return response
    except Exception as exc:
        logger.error("Comparison failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison failed: {str(exc)}",
        )
