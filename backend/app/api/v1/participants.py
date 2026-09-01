from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.participant import ParticipantOut, ParticipantCreate, ParticipantStatusUpdate
from app.services.participant_service import ParticipantService
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole

router = APIRouter()

@router.get("/studies/{study_id}/participants", response_model=List[ParticipantOut])
async def list_study_participants(
    study_id: int,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = ParticipantService(db)
    return await service.list_participants_for_study(study_id, status_filter=status)

@router.post("/studies/{study_id}/participants", response_model=ParticipantOut, status_code=status.HTTP_201_CREATED)
async def create_participant(
    study_id: int,
    participant_in: ParticipantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value
    ]))
):
    participant_in.study_id = study_id
    service = ParticipantService(db)
    return await service.create_participant(participant_in, current_user=current_user)

@router.get("/participants/{participant_id}", response_model=ParticipantOut)
async def get_participant(
    participant_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = ParticipantService(db)
    return await service.get_participant(participant_id)

@router.patch("/participants/{participant_id}/status", response_model=ParticipantOut)
async def update_participant_status(
    participant_id: int,
    status_update: ParticipantStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value
    ]))
):
    service = ParticipantService(db)
    return await service.update_participant_status(participant_id, status_update, current_user=current_user)
