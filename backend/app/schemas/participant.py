from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional
from app.models.participant import ParticipantStatus, ConsentStatus


class ParticipantBase(BaseModel):
    study_id: int
    site_id: int
    participant_code: str
    status: str = ParticipantStatus.SCREENED.value
    consent_status: str = ConsentStatus.NOT_OBTAINED.value
    consent_date: Optional[date] = None
    consent_version: Optional[str] = None
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
    # Consent can optionally be recorded at screening time
    consent_status: str = ConsentStatus.NOT_OBTAINED.value
    consent_date: Optional[date] = None
    consent_version: Optional[str] = None


class ConsentUpdate(BaseModel):
    """Used to record or withdraw informed consent on a participant."""
    consent_status: str  # NOT_OBTAINED | OBTAINED | WITHDRAWN
    consent_date: Optional[date] = None
    consent_version: Optional[str] = None
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
