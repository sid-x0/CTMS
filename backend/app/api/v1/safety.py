from typing import List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.safety import SafetyEventOut, SafetyEventCreate, CrossTrialSignal
from app.services.safety_service import SafetyService
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole

router = APIRouter()

@router.get("", response_model=List[SafetyEventOut])
async def list_safety_events(
    study_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = SafetyService(db)
    return await service.list_safety_events(study_id=study_id)

@router.post("", response_model=SafetyEventOut, status_code=status.HTTP_201_CREATED)
async def create_safety_event(
    event_in: SafetyEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value,
        UserRole.PHARMACOVIGILANCE_USER.value
    ]))
):
    service = SafetyService(db)
    return await service.create_safety_event(event_in, current_user=current_user)

@router.get("/signals", response_model=List[CrossTrialSignal])
async def get_cross_trial_safety_signals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = SafetyService(db)
    return await service.detect_cross_trial_signals()
