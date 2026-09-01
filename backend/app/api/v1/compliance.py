from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.compliance import (
    PreFlightCheckResponse,
    TerminologyMappingRequest,
    TerminologyMappingResponse
)
from app.services.compliance_service import ComplianceService
from app.services.terminology_service import TerminologyService
from app.repositories.study_repo import StudyRepository
from app.repositories.site_repo import SiteRepository
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/studies/{study_id}/preflight", response_model=PreFlightCheckResponse)
async def get_study_preflight_check(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = ComplianceService(db)
    return await service.run_preflight_check(study_id)

@router.post("/terminology/suggest", response_model=TerminologyMappingResponse)
async def suggest_terminology_mapping(
    req: TerminologyMappingRequest,
    current_user: User = Depends(get_current_user)
):
    return TerminologyService.suggest_mapping(req)

@router.get("/studies/{study_id}/fhir")
async def export_fhir_resource(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    study_repo = StudyRepository(db)
    site_repo = SiteRepository(db)
    study = await study_repo.get_by_id(study_id)
    sites = await site_repo.get_by_study(study_id)
    return TerminologyService.export_fhir_research_study(study, sites)

@router.get("/studies/{study_id}/cdisc")
async def export_cdisc_sdtm(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    study_repo = StudyRepository(db)
    study = await study_repo.get_by_id(study_id)
    return TerminologyService.export_cdisc_sdtm(study)
