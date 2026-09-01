from typing import List
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.milestone_repo import StudyMilestoneRepository
from app.repositories.study_repo import StudyRepository
from app.models.milestone import StudyMilestone, MilestoneStatus
from app.schemas.milestone import StudyMilestoneCreate, StudyMilestoneUpdate, StudyMilestoneOut
from app.audit.logger import log_audit_event

class MilestoneService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.milestone_repo = StudyMilestoneRepository(db)
        self.study_repo = StudyRepository(db)

    async def get_milestone(self, milestone_id: int) -> StudyMilestoneOut:
        m = await self.milestone_repo.get_by_id(milestone_id)
        if not m:
            raise HTTPException(status_code=404, detail="Milestone not found")
        is_overdue = m.planned_date < date.today() and m.status != MilestoneStatus.COMPLETED.value
        out = StudyMilestoneOut.model_validate(m)
        out.is_overdue = is_overdue
        return out

    async def list_milestones_for_study(self, study_id: int) -> List[StudyMilestoneOut]:
        milestones = await self.milestone_repo.get_by_study(study_id)
        today = date.today()
        results = []
        for m in milestones:
            is_overdue = m.planned_date < today and m.status != MilestoneStatus.COMPLETED.value
            out = StudyMilestoneOut.model_validate(m)
            out.is_overdue = is_overdue
            results.append(out)
        return results

    async def create_milestone(self, m_data: StudyMilestoneCreate, current_user: any) -> StudyMilestoneOut:
        study = await self.study_repo.get_by_id(m_data.study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")

        milestone = StudyMilestone(**m_data.model_dump())
        created = await self.milestone_repo.create(milestone)

        await log_audit_event(
            db=self.db,
            action="CREATE",
            entity_type="Milestone",
            entity_id=str(created.id),
            description=f"Created milestone '{created.name}' for study {study.protocol_number}",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            new_value=m_data.model_dump(mode="json")
        )

        return await self.get_milestone(created.id)

    async def update_milestone(self, milestone_id: int, update_data: StudyMilestoneUpdate, current_user: any) -> StudyMilestoneOut:
        m = await self.milestone_repo.get_by_id(milestone_id)
        if not m:
            raise HTTPException(status_code=404, detail="Milestone not found")

        prev_dict = {"status": m.status, "actual_date": str(m.actual_date) if m.actual_date else None}

        changes = update_data.model_dump(exclude_unset=True)
        for key, value in changes.items():
            setattr(m, key, value)

        if changes.get("status") == MilestoneStatus.COMPLETED.value and not m.actual_date:
            m.actual_date = date.today()

        updated = await self.milestone_repo.update(m)

        await log_audit_event(
            db=self.db,
            action="UPDATE",
            entity_type="Milestone",
            entity_id=str(updated.id),
            description=f"Updated milestone '{updated.name}' status to '{updated.status}'",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            previous_value=prev_dict,
            new_value=changes
        )

        return await self.get_milestone(updated.id)
