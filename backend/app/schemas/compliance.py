from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class PreFlightItem(BaseModel):
    key: str
    title: str
    passed: bool
    details: str

class PreFlightCheckResponse(BaseModel):
    study_id: int
    protocol_number: str
    ready_for_activation: bool
    block_reason: Optional[str] = None
    checklist: List[PreFlightItem]

class TrialRiskBreakdown(BaseModel):
    score: int  # 0 to 100
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    recruitment_score: int
    compliance_score: int
    data_quality_score: int
    deviation_score: int
    safety_score: int
    primary_driver: str
    expected_recruitment_pace: float
    current_recruitment_pace: float

class AttentionItem(BaseModel):
    id: str
    severity: str  # CRITICAL, HIGH, MEDIUM, INFO
    title: str
    issue: str
    study_protocol: str
    study_id: int
    metric_detail: str
    time_remaining: Optional[str] = None
    responsible_role: str
    action_label: str  # e.g., "Review SAE", "Investigate Lag", "Schedule Visit"
    action_target: str  # Tab or route

class TerminologyMappingRequest(BaseModel):
    ayurveda_term: str

class TerminologyMappingResponse(BaseModel):
    input_term: str
    suggested_interpretation: str
    standardized_code: str
    coding_system: str = "MedDRA / SNOMED CT Aligned"
    confidence_percentage: int
    alternative_terms: List[str]
