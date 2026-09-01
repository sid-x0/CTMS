from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.participant import Participant, ParticipantStatus

class ParticipantRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, participant_id: int) -> Optional[Participant]:
        result = await self.db.execute(select(Participant).where(Participant.id == participant_id))
        return result.scalars().first()

    async def get_by_code(self, participant_code: str) -> Optional[Participant]:
        result = await self.db.execute(select(Participant).where(Participant.participant_code == participant_code))
        return result.scalars().first()

    async def get_by_study(self, study_id: int, status: Optional[str] = None) -> List[Participant]:
        query = select(Participant).where(Participant.study_id == study_id)
        if status:
            query = query.where(Participant.status == status)
        query = query.order_by(Participant.id.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_by_site(self, site_id: int) -> List[Participant]:
        result = await self.db.execute(
            select(Participant).where(Participant.site_id == site_id).order_by(Participant.id.desc())
        )
        return result.scalars().all()

    async def count_by_study_and_status(self, study_id: int, status: str) -> int:
        result = await self.db.execute(
            select(func.count(Participant.id)).where(
                and_(Participant.study_id == study_id, Participant.status == status)
            )
        )
        return result.scalar() or 0

    async def create(self, participant: Participant) -> Participant:
        self.db.add(participant)
        await self.db.commit()
        await self.db.refresh(participant)
        return participant

    async def update(self, participant: Participant) -> Participant:
        await self.db.commit()
        await self.db.refresh(participant)
        return participant
