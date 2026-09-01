from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.models.participant import ParticipantStatus

class ParticipantBase(BaseModel):
    study_id: int
    site_id: int
    participant_code: str
    status: str = ParticipantStatus.SCREENED.value
    screening_date: Optional[date] = None
    enrollment_date: Optional[date] = None
    randomization_date: Optional[date] = None
    completion_date: Optional[date] = None
    withdrawal_date: Optional[date] = None
    notes: Optional[str] = None

class ParticipantCreate(BaseModel):
    study_id: int
    site_id: int
    participant_code: str
    notes: Optional[str] = None

class ParticipantStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    event_date: Optional[date] = None

class ParticipantOut(ParticipantBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
