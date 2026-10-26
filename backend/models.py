"""
ContextLens – Pydantic request/response schemas.

Classification values (primary):
  SUPPORTED             – evidence directly supports the claim
  CONTRADICTED          – reliable evidence directly conflicts with the claim
  PARTIALLY_SUPPORTED   – some aspects are supported, full claim is not established
  DIFFERENT_CONTEXT     – passages differ due to dates, scope, definitions, or methods
  INSUFFICIENT_EVIDENCE – available evidence does not justify a conclusion
  UNRELATED             – evidence does not meaningfully address the claim

For backward compatibility, the old labels (consistent, possible_contradiction,
different_context, insufficient_context) are still accepted by the frontend.
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ClaimItem(BaseModel):
    """A single text passage with optional source metadata."""
    text: str = Field(..., description="The selected text passage")
    title: Optional[str] = Field(default="Untitled Source", description="Webpage or document title")
    url: Optional[str] = Field(default="", description="Source URL")


class CompareRequest(BaseModel):
    """Payload for the /compare endpoint."""
    claim_a: ClaimItem
    claim_b: ClaimItem


# ---------------------------------------------------------------------------
# Additional source model
# ---------------------------------------------------------------------------

class AdditionalSource(BaseModel):
    """A source discovered during the search phase."""
    title: str = Field(..., description="Title of the source")
    url: str = Field(..., description="URL of the source")
    publisher: Optional[str] = Field(default=None, description="Publisher or domain name")
    published_date: Optional[str] = Field(default=None, description="Publication date if known")
    source_type: Optional[str] = Field(
        default=None,
        description="Type: news, academic, government, forum, primary, etc."
    )
    relationship_to_claim: Literal["supports", "contradicts", "contextualizes", "unclear"] = Field(
        default="unclear",
        description="How this source relates to the claim"
    )
    relevance_reason: str = Field(
        default="",
        description="Short explanation of why this source is relevant"
    )
    supporting_excerpt: Optional[str] = Field(
        default=None,
        description="Snippet from the source (only when actually retrieved)"
    )
    limitations: Optional[str] = Field(
        default=None,
        description="Known limitations of this source's coverage or methodology"
    )
    retrieval_status: Literal["retrieved", "snippet_only", "search_result_only", "not_retrieved"] = Field(
        default="search_result_only",
        description="What level of content was actually obtained"
    )


# ---------------------------------------------------------------------------
# Primary analysis response
# ---------------------------------------------------------------------------

VALID_CLASSIFICATIONS = {
    # New canonical labels
    "SUPPORTED",
    "CONTRADICTED",
    "PARTIALLY_SUPPORTED",
    "DIFFERENT_CONTEXT",
    "INSUFFICIENT_EVIDENCE",
    "UNRELATED",
    # Old labels kept for backward compatibility
    "consistent",
    "possible_contradiction",
    "different_context",
    "insufficient_context",
}


class CompareResponse(BaseModel):
    """Full analysis result returned by the /compare endpoint."""

    # Core classification
    classification: str = Field(
        ...,
        description=(
            "SUPPORTED | CONTRADICTED | PARTIALLY_SUPPORTED | DIFFERENT_CONTEXT "
            "| INSUFFICIENT_EVIDENCE | UNRELATED"
        )
    )
    analysis_summary: str = Field(
        default="",
        description="Concise plain-language summary grounded in the supplied passages"
    )

    # Legacy field kept for backward compatibility
    explanation: str = Field(
        default="",
        description="Short explanation (alias for analysis_summary)"
    )

    # Evidence interpretation
    claim_interpretation: str = Field(
        default="",
        description="What the claim asserts: entities, dates, quantities, type of claim"
    )
    evidence_interpretation: str = Field(
        default="",
        description="What the evidence passage states and whether it addresses the claim"
    )

    # Structured findings
    key_differences: List[str] = Field(
        default_factory=list,
        description="Real differences between the supplied passages (not invented)"
    )
    supporting_points: List[str] = Field(
        default_factory=list,
        description="Specific quotes or paraphrases from evidence that support the claim"
    )
    contradicting_points: List[str] = Field(
        default_factory=list,
        description="Specific quotes or paraphrases from evidence that contradict the claim"
    )
    missing_context: List[str] = Field(
        default_factory=list,
        description="Contextual elements that would clarify the relationship"
    )
    verification_questions: List[str] = Field(
        default_factory=list,
        description="Targeted questions the user should investigate"
    )

    # Confidence
    confidence: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Model-estimated confidence 0–1 (not a calibrated probability)"
    )
    confidence_reason: str = Field(
        default="",
        description="Explanation of the main sources of uncertainty"
    )

    # Limitations
    limitations: List[str] = Field(
        default_factory=list,
        description="Known limitations of this analysis"
    )

    # Legacy evidence quote fields (kept for backward compatibility)
    evidence_a: str = Field(default="", description="Relevant excerpt from passage A")
    evidence_b: str = Field(default="", description="Relevant excerpt from passage B")

    # Source references (from request)
    source_references: List[str] = Field(
        default_factory=list,
        description="Source references from the supplied passages"
    )

    # Additional discovered sources
    additional_sources: List[AdditionalSource] = Field(
        default_factory=list,
        description="Sources found during web search that relate to the claim"
    )

    # Engine metadata
    engine: str = Field(
        default="heuristic",
        description="Which engine produced this result: llm, heuristic, or error"
    )

    @field_validator("classification")
    @classmethod
    def validate_classification(cls, v: str) -> str:
        if v not in VALID_CLASSIFICATIONS:
            # Normalise case before rejecting
            upper = v.upper()
            lower = v.lower()
            if upper in VALID_CLASSIFICATIONS:
                return upper
            if lower in VALID_CLASSIFICATIONS:
                return lower
            # Accept partial matches for resilience
            for label in VALID_CLASSIFICATIONS:
                if label.lower() in lower or lower in label.lower():
                    return label
            # Fall back gracefully
            return "INSUFFICIENT_EVIDENCE"
        return v

    def model_post_init(self, __context) -> None:
        """Sync legacy fields with new canonical fields."""
        # Sync explanation <-> analysis_summary
        if not self.analysis_summary and self.explanation:
            object.__setattr__(self, "analysis_summary", self.explanation)
        elif not self.explanation and self.analysis_summary:
            object.__setattr__(self, "explanation", self.analysis_summary)


# ---------------------------------------------------------------------------
# Error model
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    engine: str = "error"
