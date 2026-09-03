from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional


class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime
    user_id: Optional[int] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    ip_address: Optional[str] = None
    description: str
    # Hash chain fields (may be None for legacy records)
    previous_hash: Optional[str] = None
    record_hash: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AuditIntegrityResult(BaseModel):
    valid: bool
    total_records: int
    first_invalid_id: Optional[int] = None
    message: str
