import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from app.db.session import Base

class UserRole(str, enum.Enum):
    ADMINISTRATOR = "Administrator"
    PRINCIPAL_INVESTIGATOR = "Principal Investigator"
    STUDY_COORDINATOR = "Study Coordinator"
    CLINICAL_TRIAL_MONITOR = "Clinical Trial Monitor"
    ETHICS_COMMITTEE_MEMBER = "Ethics Committee Member"
    PHARMACOVIGILANCE_USER = "Pharmacovigilance User"
    REGULATOR = "Regulator / Read-only User"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(100), nullable=False, default=UserRole.STUDY_COORDINATOR.value)
    organization = Column(String(255), nullable=False, default="All India Institute of Ayurveda (AIIA)")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
