from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class SiteBase(BaseModel):
    study_id: int
    site_name: str
    site_code: str
    institution: str
    location: str
    investigator: str
    activation_date: Optional[date] = None
    status: str = "Active"
    target_enrollment: int = 50

class SiteCreate(SiteBase):
    pass

class SiteUpdate(BaseModel):
    site_name: Optional[str] = None
    site_code: Optional[str] = None
    institution: Optional[str] = None
    location: Optional[str] = None
    investigator: Optional[str] = None
    activation_date: Optional[date] = None
    status: Optional[str] = None
    target_enrollment: Optional[int] = None

class SiteOut(SiteBase):
    id: int
    current_enrollment: int
    created_at: datetime
    updated_at: datetime
    recruitment_percentage: float = 0.0

    model_config = ConfigDict(from_attributes=True)
