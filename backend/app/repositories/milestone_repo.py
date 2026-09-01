from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import date
from app.models.milestone import StudyMilestone, MilestoneStatus

class StudyMilestoneRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, milestone_id: int) -> Optional[StudyMilestone]:
        result = await self.db.execute(select(StudyMilestone).where(StudyMilestone.id == milestone_id))
        return result.scalars().first()

    async def get_by_study(self, study_id: int) -> List[StudyMilestone]:
        result = await self.db.execute(
            select(StudyMilestone).where(StudyMilestone.study_id == study_id).order_by(StudyMilestone.planned_date.asc())
        )
        return result.scalars().all()

    async def get_all_upcoming(self, today: date, limit: int = 10) -> List[StudyMilestone]:
        result = await self.db.execute(
            select(StudyMilestone)
            .where(and_(StudyMilestone.planned_date >= today, StudyMilestone.status != MilestoneStatus.COMPLETED.value))
            .order_by(StudyMilestone.planned_date.asc())
            .limit(limit)
        )
        return result.scalars().all()

    async def get_all_overdue(self, today: date, limit: int = 10) -> List[StudyMilestone]:
        result = await self.db.execute(
            select(StudyMilestone)
            .where(and_(StudyMilestone.planned_date < today, StudyMilestone.status != MilestoneStatus.COMPLETED.value))
            .order_by(StudyMilestone.planned_date.asc())
            .limit(limit)
        )
        return result.scalars().all()

    async def create(self, milestone: StudyMilestone) -> StudyMilestone:
        self.db.add(milestone)
        await self.db.commit()
        await self.db.refresh(milestone)
        return milestone

    async def update(self, milestone: StudyMilestone) -> StudyMilestone:
        await self.db.commit()
        await self.db.refresh(milestone)
        return milestone
