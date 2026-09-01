from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.schemas.study import StudyOut
from app.schemas.milestone import StudyMilestoneOut
from app.schemas.alert import AlertOut
from app.schemas.compliance import AttentionItem, TrialRiskBreakdown

class PortfolioKPIs(BaseModel):
    total_studies: int
    active_studies: int
    at_risk_studies_count: int
    total_target_enrollment: int
    total_enrolled: int
    overall_recruitment_percentage: float
    open_actions_count: int
    overdue_milestones_count: int
    active_sites: int

class PortfolioRiskCounts(BaseModel):
    CRITICAL: int
    HIGH: int
    MEDIUM: int
    LOW: int

class RecruitmentTrajectoryPoint(BaseModel):
    month: str
    expected: int
    actual: int

class StudyOperationalOverview(BaseModel):
    id: int
    protocol_number: str
    title: str
    short_title: str
    principal_investigator: str
    current_enrollment: int
    target_enrollment: int
    recruitment_percentage: float
    status: str
    risk: TrialRiskBreakdown
    open_safety_events: int
    open_deviations: int
    next_deadline: str
    sites_count: int

class StudyDashboardKPIs(BaseModel):
    target_enrollment: int
    current_enrollment: int
    recruitment_percentage: float
    total_sites: int
    active_sites: int
    screened_count: int
    eligible_count: int
    enrolled_count: int
    randomized_count: int
    withdrawn_count: int
    completed_count: int
    upcoming_milestones_count: int
    overdue_milestones_count: int

class StudyDashboardResponse(BaseModel):
    study: StudyOut
    kpis: StudyDashboardKPIs
    sites: List[Any]
    milestones: List[StudyMilestoneOut]
    alerts: List[AlertOut]
    risk: TrialRiskBreakdown

class PortfolioDashboardResponse(BaseModel):
    kpis: PortfolioKPIs
    risk_distribution: PortfolioRiskCounts
    attention_required: List[AttentionItem]
    recruitment_trajectory: List[RecruitmentTrajectoryPoint]
    studies: List[StudyOperationalOverview]
    upcoming_deadlines: List[StudyMilestoneOut]
    active_alerts: List[AlertOut]
