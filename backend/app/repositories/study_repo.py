from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from app.models.study import Study, StudyStatus

class StudyRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, study_id: int) -> Optional[Study]:
        result = await self.db.execute(select(Study).where(Study.id == study_id))
        return result.scalars().first()

    async def get_by_protocol(self, protocol_number: str) -> Optional[Study]:
        result = await self.db.execute(select(Study).where(Study.protocol_number == protocol_number))
        return result.scalars().first()

    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        status: Optional[str] = None, 
        search: Optional[str] = None
    ) -> List[Study]:
        query = select(Study)
        if status:
            query = query.where(Study.status == status)
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Study.protocol_number.ilike(search_pattern),
                    Study.title.ilike(search_pattern),
                    Study.short_title.ilike(search_pattern),
                    Study.principal_investigator.ilike(search_pattern)
                )
            )
        query = query.order_by(Study.id.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def count_total(self) -> int:
        result = await self.db.execute(select(func.count(Study.id)))
        return result.scalar() or 0

    async def create(self, study: Study) -> Study:
        self.db.add(study)
        await self.db.commit()
        await self.db.refresh(study)
        return study

    async def update(self, study: Study) -> Study:
        await self.db.commit()
        await self.db.refresh(study)
        return study
