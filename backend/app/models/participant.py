import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class ParticipantStatus(str, enum.Enum):
    SCREENED = "Screened"
    ELIGIBLE = "Eligible"
    ENROLLED = "Enrolled"
    RANDOMIZED = "Randomized"
    WITHDRAWN = "Withdrawn"
    COMPLETED = "Completed"
    SCREEN_FAILURE = "Screen Failure"

class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    study_id = Column(Integer, ForeignKey("studies.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id", ondelete="CASCADE"), nullable=False)
    participant_code = Column(String(100), unique=True, index=True, nullable=False)
    status = Column(String(50), nullable=False, default=ParticipantStatus.SCREENED.value)
    
    screening_date = Column(Date, nullable=True)
    enrollment_date = Column(Date, nullable=True)
    randomization_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)
    withdrawal_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    study = relationship("Study", back_populates="participants")
    site = relationship("Site", back_populates="participants")
