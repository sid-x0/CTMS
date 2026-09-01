from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str
    user_email: str
    user_role: str
    organization: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
