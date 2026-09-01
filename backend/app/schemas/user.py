from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
from app.models.user import UserRole

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str
    organization: Optional[str] = "All India Institute of Ayurveda (AIIA)"
    active: Optional[bool] = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
