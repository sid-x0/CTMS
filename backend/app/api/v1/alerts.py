from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.alert import AlertOut
from app.repositories.alert_repo import AlertRepository
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[AlertOut])
async def list_alerts(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AlertRepository(db)
    return await repo.get_all(unread_only=unread_only)

@router.patch("/{alert_id}/read", response_model=AlertOut)
async def mark_alert_as_read(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AlertRepository(db)
    alert = await repo.mark_as_read(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert
