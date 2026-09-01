from datetime import date, datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class StudyMilestoneBase(BaseModel):
    study_id: int
    milestone_type: str
    name: str
    planned_date: date
    actual_date: Optional[date] = None
    status: str = "Pending"
    notes: Optional[str] = None

class StudyMilestoneCreate(StudyMilestoneBase):
    pass

class StudyMilestoneUpdate(BaseModel):
    name: Optional[str] = None
    milestone_type: Optional[str] = None
    planned_date: Optional[date] = None
    actual_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class StudyMilestoneOut(StudyMilestoneBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_overdue: bool = False

    model_config = ConfigDict(from_attributes=True)
