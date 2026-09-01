from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.models.site import Site

class SiteRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, site_id: int) -> Optional[Site]:
        result = await self.db.execute(select(Site).where(Site.id == site_id))
        return result.scalars().first()

    async def get_by_code(self, study_id: int, site_code: str) -> Optional[Site]:
        result = await self.db.execute(
            select(Site).where(and_(Site.study_id == study_id, Site.site_code == site_code))
        )
        return result.scalars().first()

    async def get_by_study(self, study_id: int) -> List[Site]:
        result = await self.db.execute(select(Site).where(Site.study_id == study_id).order_by(Site.id.asc()))
        return result.scalars().all()

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[Site]:
        result = await self.db.execute(select(Site).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, site: Site) -> Site:
        self.db.add(site)
        await self.db.commit()
        await self.db.refresh(site)
        return site

    async def update(self, site: Site) -> Site:
        await self.db.commit()
        await self.db.refresh(site)
        return site
