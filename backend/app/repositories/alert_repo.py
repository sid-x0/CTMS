from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.alert import Alert

class AlertRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(self, skip: int = 0, limit: int = 50, unread_only: bool = False) -> List[Alert]:
        query = select(Alert)
        if unread_only:
            query = query.where(Alert.is_read == False)
        query = query.order_by(Alert.id.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_study(self, study_id: int) -> List[Alert]:
        result = await self.db.execute(
            select(Alert).where(Alert.study_id == study_id).order_by(Alert.id.desc())
        )
        return result.scalars().all()

    async def create(self, alert: Alert) -> Alert:
        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)
        return alert

    async def mark_as_read(self, alert_id: int) -> Optional[Alert]:
        result = await self.db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalars().first()
        if alert:
            alert.is_read = True
            await self.db.commit()
            await self.db.refresh(alert)
        return alert
