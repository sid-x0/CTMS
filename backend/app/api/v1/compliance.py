from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
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
from app.repositories.milestone_repo import StudyMilestoneRepository
from app.models.milestone import MilestoneStatus
from app.audit.logger import log_audit_event
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole

router = APIRouter()


@router.get("/studies/{study_id}/preflight", response_model=PreFlightCheckResponse)
async def get_study_preflight_check(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = ComplianceService(db)
    return await service.run_preflight_check(study_id)


@router.post(
    "/studies/{study_id}/milestones/{milestone_id}/complete",
    response_model=PreFlightCheckResponse
)
async def complete_milestone_and_recheck(
    study_id: int,
    milestone_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value,
        UserRole.ETHICS_COMMITTEE_MEMBER.value
    ]))
):
    """
    Mark a milestone as Completed (sets actual_date = today, status = Completed).
    Then re-runs the pre-flight check and returns the updated result.
    This is the mutating compliance workflow action.
    """
    milestone_repo = StudyMilestoneRepository(db)
    milestone = await milestone_repo.get_by_id(milestone_id)

    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    if milestone.study_id != study_id:
        raise HTTPException(status_code=400, detail="Milestone does not belong to this study")
    if milestone.status == MilestoneStatus.COMPLETED.value:
        raise HTTPException(status_code=400, detail="Milestone is already completed")

    old_status = milestone.status
    milestone.status = MilestoneStatus.COMPLETED.value
    milestone.actual_date = date.today()
    milestone.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(milestone)

    # Audit the milestone completion
    await log_audit_event(
        db=db,
        action="STATUS_CHANGE",
        entity_type="StudyMilestone",
        entity_id=str(milestone.id),
        description=f"Milestone '{milestone.name}' (Study ID {study_id}) marked as Completed via compliance pre-flight resolution.",
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        previous_value=old_status,
        new_value=MilestoneStatus.COMPLETED.value
    )

    # Re-run the pre-flight check and return updated result
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
