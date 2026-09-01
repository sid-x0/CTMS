from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.site import SiteOut, SiteCreate, SiteUpdate
from app.services.site_service import SiteService
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole

router = APIRouter()

@router.get("/studies/{study_id}/sites", response_model=List[SiteOut])
async def list_study_sites(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = SiteService(db)
    return await service.list_sites_for_study(study_id)

@router.post("/studies/{study_id}/sites", response_model=SiteOut, status_code=status.HTTP_201_CREATED)
async def create_site(
    study_id: int,
    site_in: SiteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value
    ]))
):
    site_in.study_id = study_id
    service = SiteService(db)
    return await service.create_site(site_in, current_user=current_user)

@router.get("/sites/{site_id}", response_model=SiteOut)
async def get_site(
    site_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = SiteService(db)
    return await service.get_site(site_id)

@router.patch("/sites/{site_id}", response_model=SiteOut)
async def update_site(
    site_id: int,
    site_in: SiteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value
    ]))
):
    service = SiteService(db)
    return await service.update_site(site_id, site_in, current_user=current_user)
