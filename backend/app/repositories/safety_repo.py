from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.safety import SafetyEvent

class SafetyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, event_id: int) -> Optional[SafetyEvent]:
        result = await self.db.execute(select(SafetyEvent).where(SafetyEvent.id == event_id))
        return result.scalars().first()

    async def get_by_study(self, study_id: int) -> List[SafetyEvent]:
        result = await self.db.execute(
            select(SafetyEvent).where(SafetyEvent.study_id == study_id).order_by(SafetyEvent.onset_date.desc())
        )
        return result.scalars().all()

    async def get_all(self, limit: int = 100) -> List[SafetyEvent]:
        result = await self.db.execute(select(SafetyEvent).order_by(SafetyEvent.onset_date.desc()).limit(limit))
        return result.scalars().all()

    async def create(self, event: SafetyEvent) -> SafetyEvent:
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        return event

    async def update(self, event: SafetyEvent) -> SafetyEvent:
        await self.db.commit()
        await self.db.refresh(event)
        return event
