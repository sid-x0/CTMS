import json
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

def _serialize(obj: Any) -> str:
    if obj is None:
        return ""
    if isinstance(obj, (dict, list)):
        return json.dumps(obj, default=str)
    if hasattr(obj, "__dict__"):
        d = {k: v for k, v in obj.__dict__.items() if not k.startswith("_")}
        return json.dumps(d, default=str)
    return str(obj)

async def log_audit_event(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: Optional[str],
    description: str,
    user_id: Optional[int] = None,
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
    previous_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    """
    Append-only audit logger for CTMS compliance and traceability.
    """
    audit_entry = AuditLog(
        timestamp=datetime.now(timezone.utc),
        user_id=user_id,
        user_email=user_email,
        user_role=user_role,
        action=action.upper(),
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        previous_value=_serialize(previous_value) if previous_value is not None else None,
        new_value=_serialize(new_value) if new_value is not None else None,
        ip_address=ip_address,
        description=description
    )
    db.add(audit_entry)
    await db.commit()
    await db.refresh(audit_entry)
    return audit_entry
