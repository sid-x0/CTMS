import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class MilestoneStatus(str, enum.Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"
    OVERDUE = "Overdue"
    CANCELLED = "Cancelled"

class StudyMilestone(Base):
    __tablename__ = "study_milestones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    study_id = Column(Integer, ForeignKey("studies.id", ondelete="CASCADE"), nullable=False)
    milestone_type = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    planned_date = Column(Date, nullable=False)
    actual_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default=MilestoneStatus.PENDING.value)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    study = relationship("Study", back_populates="milestones")
