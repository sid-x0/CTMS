from typing import List
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.alert import AlertOut
from app.repositories.alert_repo import AlertRepository
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.audit.logger import log_audit_event

router = APIRouter()

# All authenticated roles can READ alerts
@router.get("", response_model=List[AlertOut])
async def list_alerts(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AlertRepository(db)
    return await repo.get_all(unread_only=unread_only)


# Regulator / Read-only User is explicitly excluded from acknowledging alerts
@router.patch("/{alert_id}/read", response_model=AlertOut)
async def mark_alert_as_read(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMINISTRATOR.value,
        UserRole.PRINCIPAL_INVESTIGATOR.value,
        UserRole.STUDY_COORDINATOR.value,
        UserRole.CLINICAL_TRIAL_MONITOR.value,
        UserRole.ETHICS_COMMITTEE_MEMBER.value,
        UserRole.PHARMACOVIGILANCE_USER.value,
    ]))
):
    repo = AlertRepository(db)
    alert = await repo.get_by_id(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    previous_state = "unread" if not alert.is_read else "read"
    updated_alert = await repo.mark_as_read(alert_id)

    # Write audit entry for every acknowledgement
    await log_audit_event(
        db=db,
        action="UPDATE",
        entity_type="Alert",
        entity_id=str(alert_id),
        description=(
            f"Alert acknowledged: [{alert.alert_type}] {alert.title}. "
            f"Study ID: {alert.study_id or 'N/A'}. Severity: {alert.severity}."
        ),
        user_id=current_user.id,
        user_email=current_user.email,
        user_role=current_user.role,
        previous_value={"is_read": False, "state": previous_state},
        new_value={"is_read": True, "state": "acknowledged"},
    )

    return updated_alert
