from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.repositories.user_repo import UserRepository
from app.core.security import verify_password, create_access_token
from app.schemas.auth import Token, LoginRequest
from app.audit.logger import log_audit_event

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def authenticate_user(self, login_data: LoginRequest, ip_address: str = None) -> Token:
        user = await self.user_repo.get_by_email(login_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated"
            )

        access_token = create_access_token(subject=user.id, role=user.role)

        # Record audit log for login
        await log_audit_event(
            db=self.db,
            action="LOGIN",
            entity_type="Auth",
            entity_id=str(user.id),
            description=f"User {user.email} ({user.role}) logged in successfully.",
            user_id=user.id,
            user_email=user.email,
            user_role=user.role,
            ip_address=ip_address
        )

        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=user.id,
            user_name=user.name,
            user_email=user.email,
            user_role=user.role,
            organization=user.organization
        )
