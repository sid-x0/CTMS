from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class AlertOut(BaseModel):
    id: int
    study_id: Optional[int] = None
    site_id: Optional[int] = None
    alert_type: str
    severity: str
    title: str
    message: str
    is_read: bool
    is_resolved: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
