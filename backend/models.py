"""
ContextLens – Pydantic request and response schemas.

Classification values (primary):
  SUPPORTED             – evidence directly supports the claim
  CONTRADICTED          – reliable evidence directly conflicts with the claim
  PARTIALLY_SUPPORTED   – some aspects are supported, full claim is not established
  DIFFERENT_CONTEXT     – passages differ due to dates, scope, definitions, or methods
  INSUFFICIENT_EVIDENCE – available evidence does not justify a conclusion
  UNRELATED             – evidence does not meaningfully address the claim

Legacy labels (consistent, possible_contradiction, different_context, insufficient_context)
are accepted and mapped for backward compatibility.
"""

from __future__ import annotations

from typing import Any, List, Optional, Literal, Set
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class ClaimItem(BaseModel):
    """A single text passage with optional source metadata."""
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., description="The selected text passage")
    title: Optional[str] = Field(default="Untitled Source", description="Webpage or document title")
    url: Optional[str] = Field(default="", description="Source URL")

    @field_validator("text", mode="before")
    @classmethod
    def validate_text_not_empty(cls, v: Any) -> str:
        if v is None or not str(v).strip():
            raise ValueError("Passage text cannot be empty.")
        return str(v)


class CompareRequest(BaseModel):
    """Payload for the /compare endpoint."""
    model_config = ConfigDict(extra="ignore")

    claim_a: ClaimItem
    claim_b: ClaimItem


# ---------------------------------------------------------------------------
# Additional source model
# ---------------------------------------------------------------------------

RelationshipType = Literal["supports", "contradicts", "contextualizes", "unclear"]
RetrievalStatusType = Literal["retrieved", "snippet_only", "search_result_only", "not_retrieved"]


class AdditionalSource(BaseModel):
    """A source discovered during external search."""
    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., description="Title of the source")
    url: str = Field(..., description="URL of the source")
    publisher: Optional[str] = Field(default=None, description="Publisher or domain name")
    published_date: Optional[str] = Field(default=None, description="Publication date if known")
    source_type: Optional[str] = Field(
        default=None,
        description="Type: news, academic, government, forum, primary, etc."
    )
    relationship_to_claim: RelationshipType = Field(
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
    retrieval_status: RetrievalStatusType = Field(
        default="search_result_only",
        description="What level of content was actually obtained"
    )

    @field_validator("relationship_to_claim", mode="before")
    @classmethod
    def normalize_relationship(cls, v: Any) -> str:
        if not v:
            return "unclear"
        s = str(v).strip().lower()
        if "support" in s:
            return "supports"
        if "contradict" in s:
            return "contradicts"
        if "context" in s or "qualif" in s:
            return "contextualizes"
        return "unclear"

    @field_validator("retrieval_status", mode="before")
    @classmethod
    def normalize_retrieval_status(cls, v: Any) -> str:
        if not v:
            return "search_result_only"
        s = str(v).strip().lower()
        if s in ("retrieved", "snippet_only", "search_result_only", "not_retrieved"):
            return s
        if "snippet" in s:
            return "snippet_only"
        if "retriev" in s:
            return "retrieved"
        return "search_result_only"


# ---------------------------------------------------------------------------
# Primary analysis response
# ---------------------------------------------------------------------------

VALID_CLASSIFICATIONS: Set[str] = {
    # Canonical labels
    "SUPPORTED",
    "CONTRADICTED",
    "PARTIALLY_SUPPORTED",
    "DIFFERENT_CONTEXT",
    "INSUFFICIENT_EVIDENCE",
    "UNRELATED",
    # Legacy labels
    "consistent",
    "possible_contradiction",
    "different_context",
    "insufficient_context",
}

ClassificationType = Literal[
    "SUPPORTED",
    "CONTRADICTED",
    "PARTIALLY_SUPPORTED",
    "DIFFERENT_CONTEXT",
    "INSUFFICIENT_EVIDENCE",
    "UNRELATED",
    "consistent",
    "possible_contradiction",
    "different_context",
    "insufficient_context",
]


class CompareResponse(BaseModel):
    """Full analysis result returned by the /compare endpoint."""
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

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

    @field_validator("classification", mode="before")
    @classmethod
    def validate_and_normalize_classification(cls, v: Any) -> str:
        if not v:
            return "INSUFFICIENT_EVIDENCE"
        raw = str(v).strip().strip("*_`'\"")
        if raw in VALID_CLASSIFICATIONS:
            return raw

        upper = raw.upper()
        lower = raw.lower()
        if upper in VALID_CLASSIFICATIONS:
            return upper
        if lower in VALID_CLASSIFICATIONS:
            return lower

        # Robust fuzzy / substring mapping
        if "CONTRADICT" in upper:
            return "CONTRADICTED"
        if "PARTIAL" in upper:
            return "PARTIALLY_SUPPORTED"
        if "SUPPORT" in upper:
            return "SUPPORTED"
        if "CONTEXT" in upper:
            return "DIFFERENT_CONTEXT"
        if "UNRELATED" in upper:
            return "UNRELATED"

        for label in VALID_CLASSIFICATIONS:
            if label.lower() in lower or lower in label.lower():
                return label

        return "INSUFFICIENT_EVIDENCE"

    @field_validator("confidence", mode="before")
    @classmethod
    def normalize_confidence(cls, v: Any) -> Optional[float]:
        if v is None or v == "":
            return None
        try:
            val = float(v)
            # If provided as percentage > 1.0 (e.g. 85), scale down
            if val > 1.0 and val <= 100.0:
                val = val / 100.0
            return max(0.0, min(1.0, val))
        except (ValueError, TypeError):
            return None

    def model_post_init(self, context: Any) -> None:
        """Sync legacy fields with new canonical fields."""
        super().model_post_init(context)
        if not self.analysis_summary and self.explanation:
            self.analysis_summary = self.explanation
        elif not self.explanation and self.analysis_summary:
            self.explanation = self.analysis_summary


# ---------------------------------------------------------------------------
# Error model
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    """Standard error response."""
    model_config = ConfigDict(extra="ignore")

    error: str
    detail: Optional[str] = None
    engine: str = "error"
