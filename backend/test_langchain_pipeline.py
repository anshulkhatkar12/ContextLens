import pytest
import os

# Ensure no real API calls can be made during tests
os.environ["GEMINI_API_KEY"]    = ""
os.environ["GROQ_API_KEY"]      = ""
os.environ["OPENAI_API_KEY"]    = ""
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["SERPAPI_KEY"]       = ""
os.environ["BRAVE_SEARCH_KEY"]  = ""
os.environ["LLM_PROVIDER"]      = ""

from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import ClaimItem, CompareResponse, SourceItem
from backend.analyzer import analyze_passages, StructuredAnalysisOutput
from backend.llm_provider import get_llm_model, LLMConfigurationError
from backend.source_search import search_sources, generate_search_query
from backend.source_evaluator import filter_and_rank_sources

client = TestClient(app)

# Helper mock factory for LangChain structured LLM
def create_mock_structured_llm(output_data: dict):
    mock_model = MagicMock()
    mock_structured = MagicMock()
    mock_structured.ainvoke = AsyncMock(return_value=StructuredAnalysisOutput(**output_data))
    mock_model.with_structured_output.return_value = mock_structured
    return mock_model


# 1. Semantically equivalent passages with different wording (SUPPORTED)
@pytest.mark.anyio
async def test_semantically_equivalent_passages():
    mock_output = {
        "classification": "SUPPORTED",
        "explanation": "Both passages state that the quarterly revenue increased by fifteen percent.",
        "interpretation_a": "Company reported 15% revenue growth in Q3.",
        "interpretation_b": "Third-quarter sales expanded by 15% compared to last year.",
        "supporting_evidence": ["revenue rose by 15%", "sales expanded by fifteen percent"],
        "contradicting_evidence": [],
        "evidence_a": "revenue rose by 15%",
        "evidence_b": "sales expanded by fifteen percent",
        "key_differences": ["Phrasing differs ('revenue rose' vs 'sales expanded') but meaning is identical."],
        "missing_context": [],
        "verification_questions": ["Did net profit also rise proportionally?"],
        "confidence": 0.95,
        "confidence_justification": "Exact factual and numerical equivalence.",
        "limitations": []
    }
    mock_llm = create_mock_structured_llm(mock_output)

    with patch("backend.analyzer.get_llm_model", return_value=(mock_llm, "mock_langchain")):
        res = await analyze_passages(
            claim_a=ClaimItem(text="The firm's Q3 revenue rose by 15% year-over-year."),
            claim_b=ClaimItem(text="Third-quarter financial results confirmed sales expanded by fifteen percent.")
        )
        assert res.classification == "SUPPORTED"
        assert res.confidence >= 0.9
        assert len(res.supporting_evidence) > 0


# 2. A direct contradiction (CONTRADICTED)
@pytest.mark.anyio
async def test_direct_contradiction():
    mock_output = {
        "classification": "CONTRADICTED",
        "explanation": "Passage A asserts the launch was delayed, whereas Passage B states it launched on schedule.",
        "interpretation_a": "Mission was postponed to October.",
        "interpretation_b": "Mission successfully launched in September on schedule.",
        "supporting_evidence": [],
        "contradicting_evidence": ["delayed to October vs launched on September 15"],
        "evidence_a": "delayed to October",
        "evidence_b": "launched on September 15",
        "key_differences": ["Conflicting status: delayed vs launched on schedule."],
        "missing_context": ["Was there a secondary payload launched earlier?"],
        "verification_questions": ["What is the official space agency mission log entry?"],
        "confidence": 0.92,
        "confidence_justification": "Mutually exclusive factual assertions.",
        "limitations": []
    }
    mock_llm = create_mock_structured_llm(mock_output)

    with patch("backend.analyzer.get_llm_model", return_value=(mock_llm, "mock_langchain")):
        res = await analyze_passages(
            claim_a=ClaimItem(text="The satellite launch was delayed to October due to thruster anomalies."),
            claim_b=ClaimItem(text="Space Flight reported the satellite launched on September 15 as planned.")
        )
        assert res.classification == "CONTRADICTED"
        assert len(res.contradicting_evidence) > 0


# 3. A partially supported claim (PARTIALLY_SUPPORTED)
@pytest.mark.anyio
async def test_partially_supported_claim():
    mock_output = {
        "classification": "PARTIALLY_SUPPORTED",
        "explanation": "Passage B confirms the battery capacity is 5000mAh, but contradicts the claim of 100W fast charging.",
        "interpretation_a": "Phone features 5000mAh battery and 100W charging.",
        "interpretation_b": "Phone has 5000mAh battery but only supports 45W charging.",
        "supporting_evidence": ["5000mAh battery confirmed"],
        "contradicting_evidence": ["charger capped at 45W, not 100W"],
        "evidence_a": "5000mAh battery and 100W fast charging",
        "evidence_b": "5000mAh capacity with 45W charging",
        "key_differences": ["Charging wattage is 45W rather than 100W."],
        "missing_context": ["Was a 100W prototype tested in earlier leaks?"],
        "verification_questions": ["What does the official retail spec sheet specify?"],
        "confidence": 0.88,
        "confidence_justification": "One component verified; one component disputed.",
        "limitations": []
    }
    mock_llm = create_mock_structured_llm(mock_output)

    with patch("backend.analyzer.get_llm_model", return_value=(mock_llm, "mock_langchain")):
        res = await analyze_passages(
            claim_a=ClaimItem(text="The flagship smartphone includes a 5000mAh battery and 100W fast charging."),
            claim_b=ClaimItem(text="Teardowns confirmed a 5000mAh battery pack, though charging speed maxes out at 45W.")
        )
        assert res.classification == "PARTIALLY_SUPPORTED"


# 4. Different time periods or contexts (DIFFERENT_CONTEXT)
@pytest.mark.anyio
async def test_different_context_and_periods():
    mock_output = {
        "classification": "DIFFERENT_CONTEXT",
        "explanation": "The figures reference two distinct calendar quarters and different regional divisions.",
        "interpretation_a": "European division sales in Q1 2024.",
        "interpretation_b": "North American division sales in Q3 2024.",
        "supporting_evidence": [],
        "contradicting_evidence": [],
        "evidence_a": "European operations reported $10M",
        "evidence_b": "North American segment recorded $25M",
        "key_differences": ["Different geographic territories and different quarters."],
        "missing_context": ["Consolidated worldwide revenue total."],
        "verification_questions": ["What was the worldwide aggregate for the full fiscal year?"],
        "confidence": 0.90,
        "confidence_justification": "Temporal and spatial divergence clearly documented.",
        "limitations": []
    }
    mock_llm = create_mock_structured_llm(mock_output)

    with patch("backend.analyzer.get_llm_model", return_value=(mock_llm, "mock_langchain")):
        res = await analyze_passages(
            claim_a=ClaimItem(text="European operations reported $10M in revenue during Q1 2024."),
            claim_b=ClaimItem(text="In Q3 2024, North American segment revenue reached $25M.")
        )
        assert res.classification == "DIFFERENT_CONTEXT"


# 5. Unrelated passages (UNRELATED)
@pytest.mark.anyio
async def test_unrelated_passages():
    mock_output = {
        "classification": "UNRELATED",
        "explanation": "Passage A discusses deep sea marine biology while Passage B discusses quantum computing algorithms.",
        "interpretation_a": "Bioluminescence in ocean trench species.",
        "interpretation_b": "Error correction in superconducting qubits.",
        "supporting_evidence": [],
        "contradicting_evidence": [],
        "evidence_a": "bioluminescence in deep sea jellyfish",
        "evidence_b": "surface code error correction for qubits",
        "key_differences": ["Completely disjoint subjects with no shared domain."],
        "missing_context": [],
        "verification_questions": [],
        "confidence": 0.98,
        "confidence_justification": "Completely unrelated domains.",
        "limitations": []
    }
    mock_llm = create_mock_structured_llm(mock_output)

    with patch("backend.analyzer.get_llm_model", return_value=(mock_llm, "mock_langchain")):
        res = await analyze_passages(
            claim_a=ClaimItem(text="Marine researchers documented bioluminescence in deep sea jellyfish."),
            claim_b=ClaimItem(text="Engineers implemented surface code error correction for quantum processors.")
        )
        assert res.classification == "UNRELATED"


# 6. Insufficient evidence (INSUFFICIENT_EVIDENCE)
@pytest.mark.anyio
async def test_insufficient_evidence():
    mock_output = {
        "classification": "INSUFFICIENT_EVIDENCE",
        "explanation": "Neither source specifies the sample size, dates, or research methodology.",
        "interpretation_a": "General claim that productivity improved.",
        "interpretation_b": "Vague statement that working hours shifted.",
        "supporting_evidence": [],
        "contradicting_evidence": [],
        "evidence_a": "productivity improved across companies",
        "evidence_b": "hours shifted over the past decade",
        "key_differences": ["Missing baseline measurements and timeframes."],
        "missing_context": ["Specific company names, sample size, and surveyed years."],
        "verification_questions": ["What peer-reviewed paper or bureau dataset generated these claims?"],
        "confidence": 0.60,
        "confidence_justification": "Too little factual detail to confirm or refute.",
        "limitations": ["Data lacks quantitative context."]
    }
    mock_llm = create_mock_structured_llm(mock_output)

    with patch("backend.analyzer.get_llm_model", return_value=(mock_llm, "mock_langchain")):
        res = await analyze_passages(
            claim_a=ClaimItem(text="Productivity improved significantly across companies."),
            claim_b=ClaimItem(text="Working hours shifted over the past decade.")
        )
        assert res.classification == "INSUFFICIENT_EVIDENCE"
        assert len(res.missing_context) > 0


# 7. Missing provider configuration
def test_missing_provider_configuration():
    with patch.dict(os.environ, {"LLM_PROVIDER": "openai"}, clear=True):
        with pytest.raises(LLMConfigurationError) as exc_info:
            get_llm_model()
        assert "OPENAI_API_KEY is not configured" in str(exc_info.value)

    with patch.dict(os.environ, {"LLM_PROVIDER": "anthropic"}, clear=True):
        with pytest.raises(LLMConfigurationError) as exc_info:
            get_llm_model()
        assert "ANTHROPIC_API_KEY is not configured" in str(exc_info.value)

    with patch.dict(os.environ, {"LLM_PROVIDER": "gemini"}, clear=True):
        with pytest.raises(LLMConfigurationError) as exc_info:
            get_llm_model()
        assert "GEMINI_API_KEY" in str(exc_info.value)

    with patch.dict(os.environ, {"LLM_PROVIDER": "groq"}, clear=True):
        with pytest.raises(LLMConfigurationError) as exc_info:
            get_llm_model()
        assert "GROQ_API_KEY is not configured" in str(exc_info.value)

    with patch.dict(os.environ, {"LLM_PROVIDER": "groq", "GROQ_API_KEY": "gsk_test"}, clear=True):
        with patch("langchain_groq.ChatGroq") as mock_groq:
            mock_groq.return_value = MagicMock()
            m, p = get_llm_model()
            assert p == "groq"


# 8. Malformed model output handling
@pytest.mark.anyio
async def test_malformed_model_output_handling():
    mock_model = MagicMock()
    mock_structured = MagicMock()
    # Simulate structured parser throwing a validation error on malformed JSON
    mock_structured.ainvoke = AsyncMock(side_effect=ValueError("Invalid JSON output from model"))
    mock_model.with_structured_output.return_value = mock_structured

    with patch("backend.analyzer.get_llm_model", return_value=(mock_model, "test_provider")):
        with pytest.raises(RuntimeError) as exc_info:
            await analyze_passages(
                claim_a=ClaimItem(text="The keynote starts at 9 AM."),
                claim_b=ClaimItem(text="Keynote is confirmed at 9 AM.")
            )
        assert "LangChain analysis failed on provider 'test_provider'" in str(exc_info.value)


# 9. AI provider failure (e.g. timeout / connection error)
@pytest.mark.anyio
async def test_ai_provider_failure():
    mock_model = MagicMock()
    mock_structured = MagicMock()
    mock_structured.ainvoke = AsyncMock(side_effect=TimeoutError("Request timed out after 25s"))
    mock_model.with_structured_output.return_value = mock_structured

    with patch("backend.analyzer.get_llm_model", return_value=(mock_model, "openai")):
        with pytest.raises(RuntimeError) as exc_info:
            await analyze_passages(
                claim_a=ClaimItem(text="The keynote starts at 9 AM."),
                claim_b=ClaimItem(text="Keynote starts at 10 AM.")
            )
        assert "Request timed out" in str(exc_info.value)


# 10. Search failure or no results
@pytest.mark.anyio
async def test_search_failure_or_no_results():
    with patch("duckduckgo_search.DDGS") as mock_ddgs:
        # Simulate DuckDuckGo network failure
        mock_ddgs.side_effect = Exception("Rate limit or connection failure")
        results = await search_sources("conference keynote 2026", max_results=3, provider="duckduckgo")
        # Returns empty list safely without crashing or hallucinating URLs
        assert results == []

    # When no results found, filter_and_rank_sources returns empty list
    ranked = filter_and_rank_sources("some claim", [])
    assert ranked == []


# 11. Source attribution and URL grounding
@pytest.mark.anyio
async def test_source_attribution_and_grounding():
    real_url = "https://example.org/press-release"
    mock_sources = [
        SourceItem(
            title="Official Statement",
            url=real_url,
            snippet="The department announced the initiative on Tuesday.",
            content_type="snippet"
        )
    ]

    with patch("backend.analyzer.search_sources", AsyncMock(return_value=mock_sources)):
        with patch("backend.analyzer.get_llm_model", return_value=(None, "heuristic")):
            res = await analyze_passages(
                claim_a=ClaimItem(text="The department announced an initiative on Tuesday.", title="Press Release", url=real_url),
                claim_b=ClaimItem(text="Officials confirmed the initiative on Tuesday.", title="News Report", url="https://news.example/report"),
                include_search=True
            )
            # URL must be grounded in actual input or retrieved source, never fabricated
            assert len(res.additional_sources) > 0
            assert res.additional_sources[0].url == real_url
            assert res.additional_sources[0].content_type == "snippet"


# 12. API response compatibility (/compare, /search-sources, /health, /demos)
def test_api_endpoints_compatibility():
    # 1. /health
    h_res = client.get("/health")
    assert h_res.status_code == 200
    h_data = h_res.json()
    assert "status" in h_data
    assert "llm_provider" in h_data
    assert "search_provider" in h_data

    # 2. /demos
    d_res = client.get("/demos")
    assert d_res.status_code == 200
    assert len(d_res.json()["scenarios"]) == 3

    # 3. /search-sources
    with patch("backend.main.search_sources", AsyncMock(return_value=[
        SourceItem(title="Mock Title", url="https://example.org/item", snippet="Valid snippet text")
    ])):
        s_res = client.get("/search-sources?q=climate+report+2025")
        assert s_res.status_code == 200
        s_data = s_res.json()
        assert "sources" in s_data
        assert len(s_data["sources"]) > 0

    # 4. /compare with heuristic fallback
    c_res = client.post("/compare", json={
        "claim_a": {"text": "DevSummit keynote takes place on Friday, Nov 14.", "title": "Source A", "url": "https://a.mock"},
        "claim_b": {"text": "All main keynote talks are on Saturday, Nov 15.", "title": "Source B", "url": "https://b.mock"}
    })
    assert c_res.status_code == 200
    c_data = c_res.json()
    assert c_data["classification"] == "possible_contradiction"


# 13. Chrome extension's expected response fields
def test_chrome_extension_expected_fields():
    payload = {
        "claim_a": {
            "text": "The laptop starts at $499 on the store listing.",
            "title": "MSRP Specs",
            "url": "https://store.example/laptop"
        },
        "claim_b": {
            "text": "The total order came to $549 at checkout with shipping and taxes.",
            "title": "Buyer Forum",
            "url": "https://forum.example/thread"
        }
    }
    response = client.post("/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    # All fields expected by sidepanel.js renderAnalysisResult()
    assert "classification" in data
    assert "explanation" in data
    assert "key_differences" in data
    assert isinstance(data["key_differences"], list)
    assert "missing_context" in data
    assert isinstance(data["missing_context"], list)
    assert "verification_questions" in data
    assert isinstance(data["verification_questions"], list)
    assert "evidence_a" in data
    assert "evidence_b" in data
    assert "confidence" in data
    assert "additional_sources" in data
