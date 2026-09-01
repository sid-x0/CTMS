from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class SafetyEventBase(BaseModel):
    study_id: int
    site_id: Optional[int] = None
    participant_code: Optional[str] = None
    event_term: str
    ayurvedic_concept: Optional[str] = None
    intervention: str
    event_type: str = "AE"
    severity: str = "Moderate"
    seriousness: bool = False
    causality: str = "Possible"
    onset_date: date
    reporting_deadline: Optional[date] = None
    status: str = "Under Review"
    description: Optional[str] = None

class SafetyEventCreate(SafetyEventBase):
    pass

class SafetyEventOut(SafetyEventBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CrossTrialSignal(BaseModel):
    event_term: str
    intervention: str
    affected_studies_count: int
    affected_sites_count: int
    reports_count: int
    trend: str = "Increasing"
    status: str = "Under Review"
    studies: List[str]
    flag_reason: str
