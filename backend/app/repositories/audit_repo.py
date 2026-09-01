from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.models.audit import AuditLog

class AuditRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        entity_type: Optional[str] = None, 
        action: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[AuditLog]:
        query = select(AuditLog)
        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type)
        if action:
            query = query.where(AuditLog.action == action.upper())
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    AuditLog.user_email.ilike(search_pattern),
                    AuditLog.description.ilike(search_pattern),
                    AuditLog.entity_type.ilike(search_pattern),
                    AuditLog.action.ilike(search_pattern)
                )
            )
        query = query.order_by(AuditLog.id.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
