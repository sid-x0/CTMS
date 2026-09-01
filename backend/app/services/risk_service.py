from datetime import date
from typing import List, Dict, Any
from app.models.study import Study, StudyStatus
from app.models.site import Site
from app.models.milestone import StudyMilestone, MilestoneStatus
from app.models.safety import SafetyEvent
from app.schemas.compliance import TrialRiskBreakdown

def calculate_study_risk(
    study: Study,
    sites: List[Site],
    milestones: List[StudyMilestone],
    safety_events: List[SafetyEvent]
) -> TrialRiskBreakdown:
    today = date.today()
    
    # 1. Recruitment Score (0 to 30)
    target = study.target_enrollment if study.target_enrollment > 0 else 100
    actual = study.current_enrollment
    pct = (actual / target) * 100
    
    recruitment_score = 0
    primary_driver = "On Track"
    
    if study.status in [StudyStatus.RECRUITING.value, StudyStatus.ACTIVE.value]:
        if pct < 30:
            recruitment_score = 25
            primary_driver = f"Recruitment lag: Only {actual}/{target} enrolled ({round(pct, 1)}%)"
        elif pct < 60:
            recruitment_score = 15
            primary_driver = f"Moderate recruitment pace: {actual}/{target} enrolled"
        else:
            recruitment_score = 5

    # 2. Compliance Score (0 to 25)
    compliance_score = 0
    overdue_m = [m for m in milestones if m.planned_date < today and m.status != MilestoneStatus.COMPLETED.value]
    if overdue_m:
        compliance_score += min(len(overdue_m) * 10, 20)
        primary_driver = f"Overdue milestone: '{overdue_m[0].name}'"

    # Check IEC approval expiration proximity (if study status is Pending IEC or active)
    if study.status == StudyStatus.PENDING_IEC.value:
        compliance_score += 15
        primary_driver = "Pending IEC Ethics Clearance"

    # 3. Data Quality Score (0 to 20)
    open_queries = getattr(study, "open_data_queries_count", 0) or 0
    data_quality_score = min(open_queries * 4, 20)
    if open_queries >= 3 and compliance_score < 15:
        primary_driver = f"{open_queries} open unresolved data queries"

    # 4. Protocol Deviation Score (0 to 15)
    deviations = getattr(study, "protocol_deviations_count", 0) or 0
    deviation_score = min(deviations * 5, 15)
    if deviations >= 2 and recruitment_score < 20:
        primary_driver = f"{deviations} protocol deviations recorded"

    # 5. Safety Score (0 to 10)
    sae_events = [e for e in safety_events if e.seriousness or e.event_type == "SAE"]
    safety_score = min(len(sae_events) * 8 + (len(safety_events) - len(sae_events)) * 2, 15)
    if sae_events and safety_score > 8:
        primary_driver = f"Serious Adverse Event ({sae_events[0].event_term}) under review"

    total_score = min(recruitment_score + compliance_score + data_quality_score + deviation_score + safety_score, 100)

    if total_score >= 75:
        risk_level = "CRITICAL"
    elif total_score >= 55:
        risk_level = "HIGH"
    elif total_score >= 35:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    expected_pace = round(target / 24, 1)  # subjects/week benchmark
    current_pace = round(actual / 16, 1) if actual > 0 else 0.5

    return TrialRiskBreakdown(
        score=total_score,
        risk_level=risk_level,
        recruitment_score=recruitment_score,
        compliance_score=compliance_score,
        data_quality_score=data_quality_score,
        deviation_score=deviation_score,
        safety_score=safety_score,
        primary_driver=primary_driver,
        expected_recruitment_pace=expected_pace,
        current_recruitment_pace=current_pace
    )
