from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.study import StudyOut, StudyCreate, StudyUpdate
from app.services.study_service import StudyService
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole

router = APIRouter()

@router.get("", response_model=List[StudyOut])
async def list_studies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = StudyService(db)
    return await service.list_studies(skip=skip, limit=limit, status_filter=status, search=search)

@router.get("/{study_id}", response_model=StudyOut)
async def get_study(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = StudyService(db)
    return await service.get_study(study_id)

@router.post("", response_model=StudyOut, status_code=status.HTTP_201_CREATED)
async def create_study(
    study_in: StudyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value
    ]))
):
    service = StudyService(db)
    return await service.create_study(study_in, current_user=current_user)

@router.patch("/{study_id}", response_model=StudyOut)
async def update_study(
    study_id: int,
    study_in: StudyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value
    ]))
):
    service = StudyService(db)
    return await service.update_study(study_id, study_in, current_user=current_user)
