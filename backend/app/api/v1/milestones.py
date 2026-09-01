from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.milestone import StudyMilestoneOut, StudyMilestoneCreate, StudyMilestoneUpdate
from app.services.milestone_service import MilestoneService
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole

router = APIRouter()

@router.get("/studies/{study_id}/milestones", response_model=List[StudyMilestoneOut])
async def list_study_milestones(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = MilestoneService(db)
    return await service.list_milestones_for_study(study_id)

@router.post("/studies/{study_id}/milestones", response_model=StudyMilestoneOut, status_code=status.HTTP_201_CREATED)
async def create_milestone(
    study_id: int,
    m_in: StudyMilestoneCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value
    ]))
):
    m_in.study_id = study_id
    service = MilestoneService(db)
    return await service.create_milestone(m_in, current_user=current_user)

@router.patch("/milestones/{milestone_id}", response_model=StudyMilestoneOut)
async def update_milestone(
    milestone_id: int,
    m_in: StudyMilestoneUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value
    ]))
):
    service = MilestoneService(db)
    return await service.update_milestone(milestone_id, m_in, current_user=current_user)
