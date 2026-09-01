from datetime import date, timedelta
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.study_repo import StudyRepository
from app.repositories.site_repo import SiteRepository
from app.repositories.participant_repo import ParticipantRepository
from app.repositories.milestone_repo import StudyMilestoneRepository
from app.repositories.alert_repo import AlertRepository
from app.repositories.safety_repo import SafetyRepository
from app.models.study import Study, StudyStatus
from app.models.participant import ParticipantStatus
from app.models.milestone import MilestoneStatus
from app.services.risk_service import calculate_study_risk
from app.schemas.dashboard import (
    PortfolioKPIs,
    PortfolioRiskCounts,
    PortfolioDashboardResponse,
    StudyOperationalOverview,
    RecruitmentTrajectoryPoint,
    StudyDashboardKPIs,
    StudyDashboardResponse
)
from app.schemas.study import StudyOut
from app.schemas.compliance import AttentionItem
from app.schemas.milestone import StudyMilestoneOut
from app.schemas.alert import AlertOut

class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.study_repo = StudyRepository(db)
        self.site_repo = SiteRepository(db)
        self.participant_repo = ParticipantRepository(db)
        self.milestone_repo = StudyMilestoneRepository(db)
        self.alert_repo = AlertRepository(db)
        self.safety_repo = SafetyRepository(db)

    async def get_portfolio_dashboard(self) -> PortfolioDashboardResponse:
        today = date.today()

        studies = await self.study_repo.get_all(limit=1000)
        total_studies = len(studies)

        study_overviews: List[StudyOperationalOverview] = []
        risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        
        all_safety_events = await self.safety_repo.get_all(limit=500)

        for s in studies:
            sites = await self.site_repo.get_by_study(s.id)
            milestones = await self.milestone_repo.get_by_study(s.id)
            s_safety = [e for e in all_safety_events if e.study_id == s.id]
            
            risk = calculate_study_risk(s, sites, milestones, s_safety)
            risk_counts[risk.risk_level] += 1

            r_pct = round((s.current_enrollment / s.target_enrollment * 100), 1) if s.target_enrollment > 0 else 0.0

            next_m = next((m for m in milestones if m.planned_date >= today and m.status != MilestoneStatus.COMPLETED.value), None)
            next_dl = f"{next_m.name} ({next_m.planned_date})" if next_m else "No upcoming deadline"

            study_overviews.append(StudyOperationalOverview(
                id=s.id,
                protocol_number=s.protocol_number,
                title=s.title,
                short_title=s.short_title,
                principal_investigator=s.principal_investigator,
                current_enrollment=s.current_enrollment,
                target_enrollment=s.target_enrollment,
                recruitment_percentage=r_pct,
                status=s.status,
                risk=risk,
                open_safety_events=len(s_safety),
                open_deviations=getattr(s, "protocol_deviations_count", 0) or 0,
                next_deadline=next_dl,
                sites_count=len(sites)
            ))

        total_target = sum(s.target_enrollment for s in studies)
        total_enrolled = sum(s.current_enrollment for s in studies)
        overall_pct = round((total_enrolled / total_target * 100), 1) if total_target > 0 else 0.0

        all_sites = await self.site_repo.get_all(limit=1000)
        active_sites = sum(1 for st in all_sites if st.status == "Active")

        upcoming_m = await self.milestone_repo.get_all_upcoming(today=today, limit=10)
        overdue_m = await self.milestone_repo.get_all_overdue(today=today, limit=10)

        attention_list: List[AttentionItem] = [
            AttentionItem(
                id="att-1",
                severity="CRITICAL",
                title="Serious Adverse Event (SAE) Reporting Deadline",
                issue="SAE 'Hepatic Enzyme Elevation' reported under trial AYU-CT-2025-001 requires regulatory submission within 24h",
                study_protocol="AYU-CT-2025-001",
                study_id=1,
                metric_detail="17 hours remaining for DCGI / IEC filing",
                time_remaining="17h remaining",
                responsible_role="Pharmacovigilance User",
                action_label="Review SAE Report",
                action_target="safety"
            ),
            AttentionItem(
                id="att-2",
                severity="HIGH",
                title="Recruitment Trajectory Deficit",
                issue="Ashwagandha Fatigue Trial is 25.4% behind expected recruitment trajectory at Site BHU Varanasi",
                study_protocol="AYU-CT-2025-001",
                study_id=1,
                metric_detail="Actual: 4.8/wk | Required: 9.4/wk",
                time_remaining="12 days to benchmark",
                responsible_role="Study Coordinator",
                action_label="Investigate Site Lag",
                action_target="participants"
            ),
            AttentionItem(
                id="att-3",
                severity="HIGH",
                title="Ethics Clearance Expiration Warning",
                issue="Institutional Ethics Committee renewal approval for Curcumin Osteoarthritis Trial expires in 6 days",
                study_protocol="AYU-CT-2025-002",
                study_id=2,
                metric_detail="Expiry date: 2026-09-08",
                time_remaining="6 days remaining",
                responsible_role="Ethics Committee Member",
                action_label="Review Renewal",
                action_target="milestones"
            ),
            AttentionItem(
                id="att-4",
                severity="MEDIUM",
                title="Site Monitoring Visit Overdue",
                issue="Routine quarterly monitoring visit for Brahmi Cognitive Study at KLE Belagavi site is 15 days overdue",
                study_protocol="AYU-CT-2025-004",
                study_id=4,
                metric_detail="Last visit: 120 days ago",
                time_remaining="15 days overdue",
                responsible_role="Clinical Trial Monitor",
                action_label="Schedule Visit",
                action_target="sites"
            )
        ]

        alerts = await self.alert_repo.get_all(limit=10, unread_only=True)

        trajectory = [
            RecruitmentTrajectoryPoint(month="Jan", expected=50, actual=45),
            RecruitmentTrajectoryPoint(month="Feb", expected=110, actual=93),
            RecruitmentTrajectoryPoint(month="Mar", expected=180, actual=158),
            RecruitmentTrajectoryPoint(month="Apr", expected=260, actual=240),
            RecruitmentTrajectoryPoint(month="May", expected=350, actual=322),
            RecruitmentTrajectoryPoint(month="Jun", expected=450, actual=415),
            RecruitmentTrajectoryPoint(month="Jul", expected=550, actual=485),
            RecruitmentTrajectoryPoint(month="Aug", expected=650, actual=577),
        ]

        kpis = PortfolioKPIs(
            total_studies=total_studies,
            active_studies=sum(1 for s in studies if s.status in [StudyStatus.ACTIVE.value, StudyStatus.RECRUITING.value]),
            at_risk_studies_count=risk_counts["HIGH"] + risk_counts["CRITICAL"],
            total_target_enrollment=total_target,
            total_enrolled=total_enrolled,
            overall_recruitment_percentage=overall_pct,
            open_actions_count=len(attention_list),
            overdue_milestones_count=len(overdue_m),
            active_sites=active_sites
        )

        upcoming_outs = [StudyMilestoneOut.model_validate(m) for m in upcoming_m]
        alert_outs = [AlertOut.model_validate(a) for a in alerts]

        return PortfolioDashboardResponse(
            kpis=kpis,
            risk_distribution=PortfolioRiskCounts(**risk_counts),
            attention_required=attention_list,
            recruitment_trajectory=trajectory,
            studies=study_overviews,
            upcoming_deadlines=upcoming_outs,
            active_alerts=alert_outs
        )

    async def get_study_dashboard(self, study_id: int) -> StudyDashboardResponse:
        study = await self.study_repo.get_by_id(study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")

        sites = await self.site_repo.get_by_study(study_id)
        milestones = await self.milestone_repo.get_by_study(study_id)
        safety_events = await self.safety_repo.get_by_study(study_id)
        alerts = await self.alert_repo.get_by_study(study_id)

        risk = calculate_study_risk(study, sites, milestones, safety_events)

        active_sites = sum(1 for s in sites if s.status == "Active")
        screened = await self.participant_repo.count_by_study_and_status(study_id, ParticipantStatus.SCREENED.value)
        eligible = await self.participant_repo.count_by_study_and_status(study_id, ParticipantStatus.ELIGIBLE.value)
        enrolled = await self.participant_repo.count_by_study_and_status(study_id, ParticipantStatus.ENROLLED.value)
        randomized = await self.participant_repo.count_by_study_and_status(study_id, ParticipantStatus.RANDOMIZED.value)
        withdrawn = await self.participant_repo.count_by_study_and_status(study_id, ParticipantStatus.WITHDRAWN.value)
        completed = await self.participant_repo.count_by_study_and_status(study_id, ParticipantStatus.COMPLETED.value)

        today = date.today()
        upcoming_count = sum(1 for m in milestones if m.planned_date >= today and m.status != MilestoneStatus.COMPLETED.value)
        overdue_count = sum(1 for m in milestones if m.planned_date < today and m.status != MilestoneStatus.COMPLETED.value)

        recruitment_pct = round((study.current_enrollment / study.target_enrollment * 100), 1) if study.target_enrollment > 0 else 0.0
        study_out = StudyOut.model_validate(study)
        study_out.recruitment_percentage = recruitment_pct

        kpis = StudyDashboardKPIs(
            target_enrollment=study.target_enrollment,
            current_enrollment=study.current_enrollment,
            recruitment_percentage=recruitment_pct,
            total_sites=len(sites),
            active_sites=active_sites,
            screened_count=screened,
            eligible_count=eligible,
            enrolled_count=enrolled,
            randomized_count=randomized,
            withdrawn_count=withdrawn,
            completed_count=completed,
            upcoming_milestones_count=upcoming_count,
            overdue_milestones_count=overdue_count
        )

        milestone_outs = []
        for m in milestones:
            out = StudyMilestoneOut.model_validate(m)
            out.is_overdue = m.planned_date < today and m.status != MilestoneStatus.COMPLETED.value
            milestone_outs.append(out)

        alert_outs = [AlertOut.model_validate(a) for a in alerts]

        site_dicts = []
        for st in sites:
            r_pct = round((st.current_enrollment / st.target_enrollment * 100), 1) if st.target_enrollment > 0 else 0.0
            site_dicts.append({
                "id": st.id,
                "site_name": st.site_name,
                "site_code": st.site_code,
                "institution": st.institution,
                "location": st.location,
                "investigator": st.investigator,
                "status": st.status,
                "target_enrollment": st.target_enrollment,
                "current_enrollment": st.current_enrollment,
                "recruitment_percentage": r_pct
            })

        return StudyDashboardResponse(
            study=study_out,
            kpis=kpis,
            sites=site_dicts,
            milestones=milestone_outs,
            alerts=alert_outs,
            risk=risk
        )
