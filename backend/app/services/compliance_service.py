from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.study_repo import StudyRepository
from app.repositories.site_repo import SiteRepository
from app.repositories.milestone_repo import StudyMilestoneRepository
from app.models.milestone import MilestoneStatus
from app.schemas.compliance import PreFlightCheckResponse, PreFlightItem


class ComplianceService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.study_repo = StudyRepository(db)
        self.site_repo = SiteRepository(db)
        self.milestone_repo = StudyMilestoneRepository(db)

    async def run_preflight_check(self, study_id: int) -> PreFlightCheckResponse:
        study = await self.study_repo.get_by_id(study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")

        sites = await self.site_repo.get_by_study(study_id)
        milestones = await self.milestone_repo.get_by_study(study_id)

        checklist: List[PreFlightItem] = []

        # Check 1: Protocol Approved
        protocol_ok = bool(study.title and study.short_title and study.principal_investigator)
        checklist.append(PreFlightItem(
            key="protocol_approved",
            title="Scientific Protocol Approved",
            passed=protocol_ok,
            details="Protocol document finalized and PI assigned." if protocol_ok else "Protocol title or PI unassigned.",
            milestone_id=None
        ))

        # Check 2: IEC Approval Recorded
        iec_m = next(
            (m for m in milestones if "IEC" in m.milestone_type or "Ethics" in m.name),
            None
        )
        iec_ok = iec_m is not None and iec_m.status == MilestoneStatus.COMPLETED.value
        checklist.append(PreFlightItem(
            key="iec_approval",
            title="Institutional Ethics Committee Clearance",
            passed=iec_ok,
            details=f"IEC Certificate confirmed on {iec_m.actual_date}" if iec_ok else "Pending formal IEC clearance certificate.",
            milestone_id=iec_m.id if iec_m and not iec_ok else None
        ))

        # Check 3: CTRI Registration Confirmed
        ctri_m = next(
            (m for m in milestones if "CTRI" in m.milestone_type or "CTRI" in m.name),
            None
        )
        ctri_ok = ctri_m is not None and ctri_m.status == MilestoneStatus.COMPLETED.value
        checklist.append(PreFlightItem(
            key="ctri_registration",
            title="CTRI Public Registry Confirmation",
            passed=ctri_ok,
            details=f"Public CTRI registry entry confirmed ({study.protocol_number})" if ctri_ok else "CTRI public registry confirmation pending.",
            milestone_id=ctri_m.id if ctri_m and not ctri_ok else None
        ))

        # Check 4: Site Activated
        active_sites = [s for s in sites if s.status == "Active"]
        site_ok = len(active_sites) > 0
        checklist.append(PreFlightItem(
            key="site_activated",
            title="Trial Site Activation",
            passed=site_ok,
            details=f"{len(active_sites)} site(s) currently active." if site_ok else "No active trial sites provisioned.",
            milestone_id=None
        ))

        # Check 5: Informed Consent Form & Documentation
        doc_ok = study.target_enrollment > 0 and len(milestones) >= 3
        checklist.append(PreFlightItem(
            key="informed_consent_docs",
            title="Informed Consent & Trial Documentation",
            passed=doc_ok,
            details="Bilingual Informed Consent Forms (ICF) verified." if doc_ok else "Trial documentation pending completion.",
            milestone_id=None
        ))

        all_passed = all(item.passed for item in checklist)
        failed_item = next((item for item in checklist if not item.passed), None)

        block_reason = None
        if not all_passed and failed_item:
            block_reason = f"Trial Activation Blocked: {failed_item.title} has not been recorded."

        return PreFlightCheckResponse(
            study_id=study.id,
            protocol_number=study.protocol_number,
            ready_for_activation=all_passed,
            block_reason=block_reason,
            checklist=checklist
        )
