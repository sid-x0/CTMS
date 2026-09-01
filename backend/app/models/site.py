from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    study_id = Column(Integer, ForeignKey("studies.id", ondelete="CASCADE"), nullable=False)
    site_name = Column(String(255), nullable=False)
    site_code = Column(String(100), nullable=False)
    institution = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    investigator = Column(String(255), nullable=False)
    activation_date = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="Active")  # Pending, Active, Suspended, Closed
    target_enrollment = Column(Integer, nullable=False, default=50)
    current_enrollment = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    study = relationship("Study", back_populates="sites")
    participants = relationship("Participant", back_populates="site", cascade="all, delete-orphan")
