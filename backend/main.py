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

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("contextlens.main")

app = FastAPI(
    title="ContextLens API",
    description="Backend service for comparing claims and evidence across web sources.",
    version="1.0.0"
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
    return {
        "project": "ContextLens",
        "tagline": "Don't just read information. Understand its context.",
        "documentation": "/docs",
        "endpoints": ["/compare", "/health", "/demos"]
    }

@app.get("/health")
def health_check():
    has_gemini = bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
    has_openai = bool(os.getenv("OPENAI_API_KEY"))
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))

    engine_name = "Built-in ContextLens Engine"
    if has_gemini:
        engine_name = "Google Gemini LLM"
    elif has_openai:
        engine_name = "OpenAI LLM"
    elif has_anthropic:
        engine_name = "Anthropic Claude LLM"

    return {
        "status": "ok",
        "service": "ContextLens Backend",
        "engine": engine_name,
        "llm_configured": has_gemini or has_openai or has_anthropic
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

@app.post("/compare", response_model=CompareResponse)
async def compare_claims(
    req: CompareRequest,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
):
    # Input validation
    text_a = req.claim_a.text.strip()
    text_b = req.claim_b.text.strip()

    if not text_a:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source A (Claim) text cannot be empty."
        )

    if not text_b:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source B (Evidence) text cannot be empty."
        )

    if len(text_a) < 5 or len(text_b) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both passages must contain at least 5 characters for meaningful comparison."
        )

    logger.info(f"Comparing Source A ('{req.claim_a.title}') with Source B ('{req.claim_b.title}')")

    try:
        response = await analyze_passages(req.claim_a, req.claim_b, api_key_override=x_api_key)
        return response
    except Exception as e:
        logger.error(f"Error during comparison: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison failed: {str(e)}"
        )
