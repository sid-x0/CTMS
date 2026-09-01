from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.auth import Token, LoginRequest
from app.schemas.user import UserOut
from app.services.auth_service import AuthService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else None
    return await auth_service.authenticate_user(
        LoginRequest(email=form_data.username, password=form_data.password),
        ip_address=client_ip
    )

@router.post("/login/json", response_model=Token)
async def login_json(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    auth_service = AuthService(db)
    client_ip = request.client.host if request.client else None
    return await auth_service.authenticate_user(login_data, ip_address=client_ip)

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
