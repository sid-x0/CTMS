from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    study_id = Column(Integer, ForeignKey("studies.id", ondelete="CASCADE"), nullable=True)
    site_id = Column(Integer, ForeignKey("sites.id", ondelete="CASCADE"), nullable=True)
    alert_type = Column(String(100), nullable=False)
    severity = Column(String(50), nullable=False, default="WARNING")  # INFO, WARNING, CRITICAL
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    study = relationship("Study", back_populates="alerts")
