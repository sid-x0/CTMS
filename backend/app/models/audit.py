from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    user_id = Column(Integer, nullable=True)
    user_email = Column(String(255), nullable=True)
    user_role = Column(String(100), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)

    # Hash chaining for tamper-evidence (SHA-256)
    # hash_n = SHA256(current_payload_json + previous_hash)
    previous_hash = Column(String(64), nullable=True)   # hash of the previous record
    record_hash = Column(String(64), nullable=True)     # hash of this record's payload
