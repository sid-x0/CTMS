from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.audit import AuditLogOut, AuditIntegrityResult
from app.repositories.audit_repo import AuditRepository
from app.audit.logger import verify_audit_chain
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("", response_model=List[AuditLogOut])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    entity_type: Optional[str] = None,
    action: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    repo = AuditRepository(db)
    return await repo.get_all(skip=skip, limit=limit, entity_type=entity_type, action=action, search=search)

@router.get("/integrity", response_model=AuditIntegrityResult)
async def check_audit_integrity(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verifies the SHA-256 hash chain of the audit log.
    IMPORTANT: This is tamper-evident (hash chain), NOT cryptographically signed.
    It detects database-level record modification but not log deletion.
    Label in UI: 'Append-only audit log with hash-chain tamper evidence.'
    """
    return await verify_audit_chain(db)
