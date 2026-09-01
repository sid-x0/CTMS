from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base

class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    study_id = Column(Integer, ForeignKey("studies.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(Integer, ForeignKey("sites.id", ondelete="CASCADE"), nullable=True)
    participant_code = Column(String(100), nullable=True)
    
    event_term = Column(String(255), nullable=False)  # e.g., Nausea, Elevated LFTs, Skin Rash
    ayurvedic_concept = Column(String(255), nullable=True)  # e.g. Aruchi, Yakrit Roga, Kustha
    intervention = Column(String(255), nullable=False)  # e.g. Ashwagandha Extract, AYUSH-64, Curcumin
    
    event_type = Column(String(50), nullable=False, default="AE")  # AE, SAE, ADR
    severity = Column(String(50), nullable=False, default="Moderate")  # Mild, Moderate, Severe, Life-Threatening
    seriousness = Column(Boolean, default=False)  # True if SAE
    causality = Column(String(50), nullable=False, default="Possible")  # Certain, Probable, Possible, Unlikely, Unrelated
    
    onset_date = Column(Date, nullable=False)
    reporting_deadline = Column(Date, nullable=True)
    status = Column(String(50), nullable=False, default="Under Review")  # Under Review, Reported to IEC/DCGI, Closed
    
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    study = relationship("Study", back_populates="safety_events")
