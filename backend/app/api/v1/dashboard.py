from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.dashboard import PortfolioDashboardResponse, StudyDashboardResponse
from app.services.dashboard_service import DashboardService
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/portfolio", response_model=PortfolioDashboardResponse)
async def get_portfolio_dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = DashboardService(db)
    return await service.get_portfolio_dashboard()

@router.get("/studies/{study_id}", response_model=StudyDashboardResponse)
async def get_study_dashboard(
    study_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = DashboardService(db)
    return await service.get_study_dashboard(study_id)
