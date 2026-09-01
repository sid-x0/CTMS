from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.models.study import StudyStatus

class StudyBase(BaseModel):
    protocol_number: str
    title: str
    short_title: str
    study_type: str = "Interventional"
    intervention_type: str = "Ayurvedic Formulation"
    phase: str = "Phase 2"
    sponsor: str = "AIIA / Ministry of Ayush"
    principal_investigator: str
    target_enrollment: int
    status: str = StudyStatus.DRAFT.value
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    description: Optional[str] = None

class StudyCreate(StudyBase):
    pass

class StudyUpdate(BaseModel):
    title: Optional[str] = None
    short_title: Optional[str] = None
    study_type: Optional[str] = None
    intervention_type: Optional[str] = None
    phase: Optional[str] = None
    sponsor: Optional[str] = None
    principal_investigator: Optional[str] = None
    target_enrollment: Optional[int] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    description: Optional[str] = None

class StudyOut(StudyBase):
    id: int
    current_enrollment: int
    created_at: datetime
    updated_at: datetime
    
    # Calculated properties
    recruitment_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)
