import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Float
from sqlalchemy.orm import relationship
from app.db.session import Base

class StudyStatus(str, enum.Enum):
    DRAFT = "Draft"
    PENDING_IEC = "Pending IEC Approval"
    IEC_APPROVED = "IEC Approved"
    CTRI_REGISTERED = "CTRI Registered"
    RECRUITING = "Recruiting"
    ACTIVE = "Active"
    SUSPENDED = "Suspended"
    COMPLETED = "Completed"
    CLOSED = "Closed"

class Study(Base):
    __tablename__ = "studies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    protocol_number = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(500), nullable=False)
    short_title = Column(String(255), nullable=False)
    study_type = Column(String(100), nullable=False, default="Interventional")
    intervention_type = Column(String(100), nullable=False, default="Ayurvedic Formulation")
    phase = Column(String(50), nullable=False, default="Phase 2")
    sponsor = Column(String(255), nullable=False, default="AIIA / Ministry of Ayush")
    principal_investigator = Column(String(255), nullable=False)
    target_enrollment = Column(Integer, nullable=False, default=100)
    current_enrollment = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default=StudyStatus.DRAFT.value)
    start_date = Column(Date, nullable=True)
    expected_end_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    
    # Clinical Operations Metrics
    protocol_deviations_count = Column(Integer, default=0)
    open_data_queries_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    sites = relationship("Site", back_populates="study", cascade="all, delete-orphan")
    participants = relationship("Participant", back_populates="study", cascade="all, delete-orphan")
    milestones = relationship("StudyMilestone", back_populates="study", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="study", cascade="all, delete-orphan")
    safety_events = relationship("SafetyEvent", back_populates="study", cascade="all, delete-orphan")
