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

    text: str = Field(default="", description="The selected text passage")
    title: Optional[str] = Field(default="Untitled Source", description="Webpage or document title")
    url: Optional[str] = Field(default="", description="Source URL")

    @field_validator("title", mode="before")
    def default_title_if_none(cls, v: Optional[str]) -> str:
        if v is None or not str(v).strip():
            return "Untitled Source"
        return str(v).strip()

    @field_validator("url", mode="before")
    def default_url_if_none(cls, v: Optional[str]) -> str:
        if v is None:
            return ""
        return str(v).strip()


class CompareRequest(BaseModel):
    """Payload for the /compare endpoint."""
    model_config = ConfigDict(extra="ignore")

    claim_a: ClaimItem
    claim_b: Optional[ClaimItem] = Field(default=None, description="Secondary passage or evidence")
    include_search: bool = Field(default=False, description="Whether to discover additional web sources")
    max_search_results: int = Field(default=3, ge=1, le=10, description="Max search sources to retrieve")


# ---------------------------------------------------------------------------
# Additional source model
# ---------------------------------------------------------------------------

RelationshipType = Literal["supports", "contradicts", "contextualizes", "unclear"]
RetrievalStatusType = Literal["retrieved", "snippet_only", "search_result_only", "not_retrieved"]


class AdditionalSource(BaseModel):
    """A source discovered during external search."""
    model_config = ConfigDict(extra="ignore")

    title: str = Field(default="Untitled Source", description="Title of the source")
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
    snippet: Optional[str] = Field(
        default="",
        description="Snippet alias"
    )
    content_type: str = Field(
        default="snippet",
        description="Distinguishes 'snippet' from 'full_page'"
    )
    is_relevant: bool = Field(
        default=True,
        description="Whether this source contains evidence for the claim"
    )
    relevance_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Relevance score between 0 and 1"
    )
    verified_claim: Optional[str] = Field(
        default=None,
        description="What specific fact was verified by this source"
    )
    limitations: Optional[str] = Field(
        default=None,
        description="Known limitations of this source's coverage or methodology"
    )
    retrieval_status: RetrievalStatusType = Field(
        default="snippet_only",
        description="What level of content was actually obtained"
    )

    def model_post_init(self, context: Any) -> None:
        super().model_post_init(context)
        if not self.snippet and self.supporting_excerpt:
            self.snippet = self.supporting_excerpt
        elif not self.supporting_excerpt and self.snippet:
            self.supporting_excerpt = self.snippet
        if not self.relevance_reason and self.verified_claim:
            self.relevance_reason = self.verified_claim
        elif not self.verified_claim and self.relevance_reason:
            self.verified_claim = self.relevance_reason

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
        if "retriev" in s or "page" in s:
            return "retrieved"
        return "search_result_only"


# Alias for backward and forward compatibility
SourceItem = AdditionalSource


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
    interpretation_a: str = Field(
        default="",
        description="Alias for claim_interpretation"
    )
    interpretation_b: str = Field(
        default="",
        description="Alias for evidence_interpretation"
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
    supporting_evidence: List[str] = Field(
        default_factory=list,
        description="Alias for supporting_points"
    )
    contradicting_evidence: List[str] = Field(
        default_factory=list,
        description="Alias for contradicting_points"
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
        default=0.85,
        ge=0.0,
        le=1.0,
        description="Model-estimated confidence 0–1 (not a calibrated probability)"
    )
    confidence_reason: str = Field(
        default="",
        description="Explanation of the main sources of uncertainty"
    )
    confidence_justification: str = Field(
        default="",
        description="Alias for confidence_reason"
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
    source_attribution: Optional[str] = Field(
        default=None,
        description="Primary attribution note or authority"
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
    is_heuristic_fallback: bool = Field(
        default=False,
        description="True if produced by fallback heuristic engine rather than live AI"
    )

    # Guardrails metadata
    guardrails_applied: List[str] = Field(
        default_factory=list,
        description="List of security and safety guardrails evaluated and enforced"
    )
    guardrail_warnings: List[str] = Field(
        default_factory=list,
        description="Safety, grounding, or adversarial warnings raised by guardrails"
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
            if val > 1.0 and val <= 100.0:
                val = val / 100.0
            return max(0.0, min(1.0, val))
        except (ValueError, TypeError):
            return None

    @field_validator(
        "key_differences", "missing_context", "verification_questions",
        "supporting_points", "contradicting_points", "supporting_evidence",
        "contradicting_evidence", "limitations", "additional_sources",
        "source_references", "guardrails_applied", "guardrail_warnings",
        mode="before"
    )
    def ensure_list_not_none(cls, v: Any) -> list:
        if v is None:
            return []
        if isinstance(v, list):
            return v
        return [v]

    def model_post_init(self, context: Any) -> None:
        """Sync legacy and new canonical fields bidirectionally."""
        super().model_post_init(context)
        if not self.analysis_summary and self.explanation:
            self.analysis_summary = self.explanation
        elif not self.explanation and self.analysis_summary:
            self.explanation = self.analysis_summary

        if not self.interpretation_a and self.claim_interpretation:
            self.interpretation_a = self.claim_interpretation
        elif not self.claim_interpretation and self.interpretation_a:
            self.claim_interpretation = self.interpretation_a

        if not self.interpretation_b and self.evidence_interpretation:
            self.interpretation_b = self.evidence_interpretation
        elif not self.evidence_interpretation and self.interpretation_b:
            self.evidence_interpretation = self.interpretation_b

        if not self.supporting_evidence and self.supporting_points:
            self.supporting_evidence = self.supporting_points
        elif not self.supporting_points and self.supporting_evidence:
            self.supporting_points = self.supporting_evidence

        if not self.contradicting_evidence and self.contradicting_points:
            self.contradicting_evidence = self.contradicting_points
        elif not self.contradicting_points and self.contradicting_evidence:
            self.contradicting_points = self.contradicting_evidence

        if not self.confidence_justification and self.confidence_reason:
            self.confidence_justification = self.confidence_reason
        elif not self.confidence_reason and self.confidence_justification:
            self.confidence_reason = self.confidence_justification


# ---------------------------------------------------------------------------
# Error model
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    """Standard error response."""
    model_config = ConfigDict(extra="ignore")

    error: str
    detail: Optional[str] = None
    engine: str = "error"
