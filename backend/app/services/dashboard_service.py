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

    async def _build_attention_items(
        self,
        studies: list,
        all_sites: list,
        all_milestones: list,
        all_safety_events: list,
    ) -> List[AttentionItem]:
        """Dynamically derive attention items from real DB data."""
        today = date.today()
        items: List[AttentionItem] = []
        item_id = 1

        # Build lookup maps
        study_map = {s.id: s for s in studies}
        site_map = {s.id: s for s in all_sites}

        # 1. CRITICAL — SAE events "Under Review" with deadline approaching (≤ 48h)
        for ev in all_safety_events:
            if (ev.seriousness or ev.event_type == "SAE") and ev.status == "Under Review":
                study = study_map.get(ev.study_id)
                if not study:
                    continue
                if ev.reporting_deadline:
                    deadline_dt = ev.reporting_deadline
                    days_left = (deadline_dt - today).days
                    if days_left <= 2:
                        time_str = f"{days_left * 24}h remaining" if days_left >= 0 else f"{abs(days_left)} days overdue"
                        site = site_map.get(ev.site_id) if ev.site_id else None
                        site_name = site.site_name if site else "Unknown Site"
                        items.append(AttentionItem(
                            id=f"att-{item_id}",
                            severity="CRITICAL",
                            title=f"SAE Reporting Deadline — {ev.participant_code or 'Unknown Subject'}",
                            issue=f"SAE '{ev.event_term}' in {study.short_title} at {site_name} requires expedited IEC/DCGI filing.",
                            study_protocol=study.protocol_number,
                            study_id=study.id,
                            metric_detail=f"Severity: {ev.severity} | Causality: {ev.causality} | Deadline: {ev.reporting_deadline}",
                            time_remaining=time_str,
                            responsible_role="Pharmacovigilance User",
                            action_label="Review SAE Report",
                            action_target="safety"
                        ))
                        item_id += 1

        # 2. HIGH — Recruiting studies with significant recruitment deficit (< 50%)
        for s in studies:
            if s.status in [StudyStatus.RECRUITING.value, StudyStatus.ACTIVE.value]:
                if s.target_enrollment > 0:
                    pct = (s.current_enrollment / s.target_enrollment) * 100
                    # Only flag if started more than 30 days ago and < 60%
                    start = s.start_date
                    if start and (today - start).days > 30 and pct < 60:
                        # Find underperforming site
                        study_sites = [st for st in all_sites if st.study_id == s.id]
                        worst_site = min(
                            (st for st in study_sites if st.target_enrollment > 0),
                            key=lambda st: st.current_enrollment / st.target_enrollment,
                            default=None
                        )
                        site_detail = f"Worst site: {worst_site.site_name} ({round(worst_site.current_enrollment/worst_site.target_enrollment*100,1)}%)" if worst_site else "Portfolio-wide"
                        # Calculate required pace
                        days_elapsed = (today - start).days
                        expected_pace = round(s.target_enrollment / max(days_elapsed, 1) * 7, 1)
                        actual_pace = round(s.current_enrollment / max(days_elapsed, 1) * 7, 1)
                        items.append(AttentionItem(
                            id=f"att-{item_id}",
                            severity="HIGH",
                            title=f"Recruitment Deficit — {s.short_title}",
                            issue=f"{s.short_title} is {round(100 - pct, 1)}% behind expected recruitment trajectory. {site_detail}.",
                            study_protocol=s.protocol_number,
                            study_id=s.id,
                            metric_detail=f"Actual: {actual_pace}/wk | Required: {expected_pace}/wk | Enrolled: {s.current_enrollment}/{s.target_enrollment}",
                            time_remaining=None,
                            responsible_role="Study Coordinator",
                            action_label="Investigate Site Lag",
                            action_target="sites"
                        ))
                        item_id += 1

        # 3. HIGH — Overdue milestones
        seen_study_overdue = set()
        for m in all_milestones:
            if m.planned_date < today and m.status not in [MilestoneStatus.COMPLETED.value, MilestoneStatus.CANCELLED.value]:
                study = study_map.get(m.study_id)
                if not study:
                    continue
                days_overdue = (today - m.planned_date).days
                items.append(AttentionItem(
                    id=f"att-{item_id}",
                    severity="HIGH" if days_overdue > 7 else "MEDIUM",
                    title=f"Overdue Milestone — {m.name[:50]}",
                    issue=f"'{m.name}' in {study.short_title} is {days_overdue} day(s) overdue. {m.notes or 'No additional notes.'}",
                    study_protocol=study.protocol_number,
                    study_id=study.id,
                    metric_detail=f"Planned: {m.planned_date} | Status: {m.status} | {days_overdue} days past deadline",
                    time_remaining=f"{days_overdue} days overdue",
                    responsible_role="Study Coordinator",
                    action_label="Review Milestone",
                    action_target="milestones"
                ))
                item_id += 1

        # 4. HIGH — IEC renewal upcoming (within 10 days)
        for m in all_milestones:
            if "IEC" in m.milestone_type and "Renewal" in m.name and m.status == MilestoneStatus.PENDING.value:
                study = study_map.get(m.study_id)
                if not study:
                    continue
                days_left = (m.planned_date - today).days
                if 0 <= days_left <= 10:
                    items.append(AttentionItem(
                        id=f"att-{item_id}",
                        severity="HIGH",
                        title=f"Ethics Clearance Renewal Due in {days_left} Days",
                        issue=f"IEC renewal for {study.short_title} expires in {days_left} day(s). Failure to renew may result in trial suspension.",
                        study_protocol=study.protocol_number,
                        study_id=study.id,
                        metric_detail=f"Renewal deadline: {m.planned_date}",
                        time_remaining=f"{days_left} days remaining",
                        responsible_role="Ethics Committee Member",
                        action_label="Review Renewal",
                        action_target="milestones"
                    ))
                    item_id += 1

        # Sort: CRITICAL first, then HIGH, then MEDIUM
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "INFO": 3}
        items.sort(key=lambda x: severity_order.get(x.severity, 9))

        # Return top 8
        return items[:8]

    async def get_portfolio_dashboard(self) -> PortfolioDashboardResponse:
        today = date.today()

        studies = await self.study_repo.get_all(limit=1000)
        total_studies = len(studies)

        all_safety_events = await self.safety_repo.get_all(limit=500)
        all_sites = await self.site_repo.get_all(limit=1000)
        all_milestones_raw = []
        for s in studies:
            ms = await self.milestone_repo.get_by_study(s.id)
            all_milestones_raw.extend(ms)

        study_overviews: List[StudyOperationalOverview] = []
        risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}

        for s in studies:
            sites = [st for st in all_sites if st.study_id == s.id]
            milestones = [m for m in all_milestones_raw if m.study_id == s.id]
            s_safety = [e for e in all_safety_events if e.study_id == s.id]

            risk = calculate_study_risk(s, sites, milestones, s_safety)
            risk_counts[risk.risk_level] += 1

            r_pct = round((s.current_enrollment / s.target_enrollment * 100), 1) if s.target_enrollment > 0 else 0.0

            next_m = next(
                (m for m in sorted(milestones, key=lambda m: m.planned_date)
                 if m.planned_date >= today and m.status != MilestoneStatus.COMPLETED.value),
                None
            )
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

        active_sites = sum(1 for st in all_sites if st.status == "Active")

        upcoming_m = await self.milestone_repo.get_all_upcoming(today=today, limit=10)
        overdue_m = await self.milestone_repo.get_all_overdue(today=today, limit=10)

        # Dynamic attention items from actual DB data
        attention_list = await self._build_attention_items(
            studies=studies,
            all_sites=all_sites,
            all_milestones=all_milestones_raw,
            all_safety_events=all_safety_events,
        )

        alerts = await self.alert_repo.get_all(limit=10, unread_only=True)

        # Compute recruitment trajectory from study data
        # Build monthly cumulative enrollment based on start dates and current enrollment
        trajectory = self._compute_recruitment_trajectory(studies, today)

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

    def _compute_recruitment_trajectory(self, studies: list, today: date) -> List[RecruitmentTrajectoryPoint]:
        """
        Compute a simplified monthly enrollment trajectory.
        For each of the past 8 months, estimate cumulative expected vs actual enrollment
        based on study start dates, target enrollment, and current enrollment.
        """
        from calendar import month_abbr

        months = []
        for i in range(7, -1, -1):
            m_date = today.replace(day=1) - timedelta(days=i * 30)
            months.append(m_date)

        total_target = sum(s.target_enrollment for s in studies)
        total_current = sum(s.current_enrollment for s in studies)

        # Distribute current enrollment across months proportionally
        # using a simple linear ramp from 0 → total_current over the period
        points = []
        for idx, m_date in enumerate(months):
            fraction = (idx + 1) / len(months)
            # Expected: linear ramp toward total_target
            expected = round(total_target * fraction * 0.85)  # 85% pace assumption
            # Actual: lags expected slightly, peaks at current enrollment
            actual = round(total_current * fraction * (0.9 + 0.1 * fraction))
            actual = min(actual, total_current)
            label = month_abbr[m_date.month]
            points.append(RecruitmentTrajectoryPoint(
                month=label,
                expected=expected,
                actual=actual
            ))

        return points

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
        screen_failures = await self.participant_repo.count_by_study_and_status(study_id, ParticipantStatus.SCREEN_FAILURE.value)

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
