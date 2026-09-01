from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.user import UserOut, UserCreate
from app.repositories.user_repo import UserRepository
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.api.deps import require_roles
from app.audit.logger import log_audit_event

router = APIRouter()

@router.get("", response_model=List[UserOut])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMINISTRATOR.value]))
):
    repo = UserRepository(db)
    return await repo.get_all(skip=skip, limit=limit)

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMINISTRATOR.value]))
):
    repo = UserRepository(db)
    existing = await repo.get_by_email(user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        organization=user_in.organization or "All India Institute of Ayurveda (AIIA)",
        active=user_in.active
    )
    created = await repo.create(user)

    await log_audit_event(
        db=self_db if 'self_db' in locals() else db,
        action="CREATE",
        entity_type="User",
        entity_id=str(created.id),
        description=f"Created user '{created.email}' with role '{created.role}'",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role
    )

    return created
