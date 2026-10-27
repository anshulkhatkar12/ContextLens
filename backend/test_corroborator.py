"""
ContextLens – Tests for 🌐 One-Click Corroborator (Auto-Discovery Engine).
Tests auto-discovery, tri-perspective categorization (Supporting, Opposing, Neutral),
and endpoint verification.
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from backend.main import app
from backend.models import ClaimItem, SourceItem, CorroborateRequest, CorroborateResponse
from backend.source_search import discover_corroboration_sources
from backend.analyzer import corroborate_claim

client = TestClient(app)


@pytest.mark.anyio
async def test_discover_corroboration_sources_categories():
    """Verify discover_corroboration_sources returns supporting, opposing, and neutral buckets."""
    mock_items = [
        SourceItem(
            title="Official Study",
            url="https://cdc.gov/data/study-1",
            snippet="CDC official study confirms positive correlations.",
            content_type="snippet"
        )
    ]
    with patch("backend.source_search.search_sources", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = mock_items
        res = await discover_corroboration_sources("test claim", max_per_category=2)
        assert "supporting" in res
        assert "opposing" in res
        assert "neutral" in res
        assert len(res["supporting"]) >= 1
        assert res["supporting"][0].relationship_to_claim == "supports"


@pytest.mark.anyio
async def test_corroborate_claim_heuristic():
    """Verify corroborate_claim works end-to-end with heuristic fallback."""
    claim = ClaimItem(
        text="The new medication reduces recovery times by 40% across clinical trials.",
        title="Medical Journal Report",
        url="https://health-journal.org/trial-40"
    )

    res = await corroborate_claim(claim=claim, max_results=6)
    assert isinstance(res, CorroborateResponse)
    assert res.auto_discovered is True
    assert res.classification in [
        "SUPPORTED", "CONTRADICTED", "PARTIALLY_SUPPORTED",
        "DIFFERENT_CONTEXT", "INSUFFICIENT_EVIDENCE"
    ]
    assert len(res.supporting_sources) > 0 or len(res.opposing_sources) > 0 or len(res.neutral_sources) > 0
    assert res.primary_supporting_evidence is not None
    assert res.mainstream_opposing_arguments is not None
    assert res.context_reconciliations is not None


def test_corroborate_endpoint_success():
    """Test POST /corroborate endpoint returns valid CorroborateResponse."""
    payload = {
        "claim": {
            "text": "Remote workers report 22% higher job satisfaction than in-office employees.",
            "title": "Workplace Future Survey",
            "url": "https://workplace.org/remote-study"
        },
        "max_search_results": 6
    }
    response = client.post("/corroborate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["auto_discovered"] is True
    assert "supporting_sources" in data
    assert "opposing_sources" in data
    assert "neutral_sources" in data
    assert "primary_supporting_evidence" in data
    assert "mainstream_opposing_arguments" in data
    assert "context_reconciliations" in data
    assert data["classification"] is not None


def test_corroborate_endpoint_validation():
    """Test POST /corroborate rejects empty or too short text."""
    # Empty text
    res1 = client.post("/corroborate", json={"claim": {"text": ""}})
    assert res1.status_code == 400

    # Too short text
    res2 = client.post("/corroborate", json={"claim": {"text": "abc"}})
    assert res2.status_code == 400
