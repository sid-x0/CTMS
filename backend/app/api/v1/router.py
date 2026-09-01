from fastapi import APIRouter
from app.api.v1 import (
    auth,
    users,
    studies,
    sites,
    participants,
    milestones,
    dashboard,
    audit_logs,
    alerts,
    safety,
    compliance
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(studies.router, prefix="/studies", tags=["Studies"])
api_router.include_router(sites.router, tags=["Sites"])
api_router.include_router(participants.router, tags=["Participants"])
api_router.include_router(milestones.router, tags=["Milestones"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["Audit Trail"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(safety.router, prefix="/safety", tags=["Pharmacovigilance"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["Compliance & Interoperability"])
