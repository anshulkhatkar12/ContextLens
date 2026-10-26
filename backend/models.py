from typing import List, Optional
from pydantic import BaseModel, Field

class ClaimItem(BaseModel):
    text: str = Field(..., description="The selected text passage")
    title: Optional[str] = Field(default="Untitled Source", description="Webpage or document title")
    url: Optional[str] = Field(default="", description="Source URL")

class CompareRequest(BaseModel):
    claim_a: ClaimItem
    claim_b: ClaimItem

class CompareResponse(BaseModel):
    classification: str = Field(
        ...,
        description="One of: possible_contradiction, consistent, different_context, insufficient_context"
    )
    explanation: str = Field(..., description="Short explanation of the relationship between statements")
    key_differences: List[str] = Field(default_factory=list, description="Important factual differences")
    missing_context: List[str] = Field(default_factory=list, description="Contextual elements missing or needed")
    verification_questions: List[str] = Field(default_factory=list, description="Questions user should investigate")
    evidence_a: str = Field(..., description="Evidence quote from passage A")
    evidence_b: str = Field(..., description="Evidence quote from passage B")
