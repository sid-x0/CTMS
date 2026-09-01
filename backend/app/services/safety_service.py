from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.safety_repo import SafetyRepository
from app.repositories.study_repo import StudyRepository
from app.models.safety import SafetyEvent
from app.schemas.safety import SafetyEventCreate, SafetyEventOut, CrossTrialSignal
from app.audit.logger import log_audit_event

class SafetyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.safety_repo = SafetyRepository(db)
        self.study_repo = StudyRepository(db)

    async def list_safety_events(self, study_id: int = None) -> List[SafetyEventOut]:
        if study_id:
            events = await self.safety_repo.get_by_study(study_id)
        else:
            events = await self.safety_repo.get_all(limit=200)
        return [SafetyEventOut.model_validate(e) for e in events]

    async def create_safety_event(self, event_data: SafetyEventCreate, current_user: any) -> SafetyEventOut:
        study = await self.study_repo.get_by_id(event_data.study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")

        event = SafetyEvent(**event_data.model_dump())
        created = await self.safety_repo.create(event)

        # Audit event
        await log_audit_event(
            db=self.db,
            action="CREATE",
            entity_type="SafetyEvent",
            entity_id=str(created.id),
            description=f"Recorded Safety Event ({created.event_type}: {created.event_term}) for study {study.protocol_number}",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            new_value=event_data.model_dump(mode="json")
        )

        return SafetyEventOut.model_validate(created)

    async def detect_cross_trial_signals(self) -> List[CrossTrialSignal]:
        events = await self.safety_repo.get_all(limit=500)
        
        # Group events by (intervention, event_term)
        grouped: Dict[tuple, List[SafetyEvent]] = {}
        for e in events:
            key = (e.intervention.strip().lower(), e.event_term.strip().lower())
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(e)

        signals: List[CrossTrialSignal] = []

        for (interv_key, event_key), ev_list in grouped.items():
            studies = list(set(e.study_id for e in ev_list))
            sites = list(set(e.site_id for e in ev_list if e.site_id))
            
            # Signal threshold: if events affect >= 2 studies OR >= 3 reports across multi-center sites
            if len(studies) >= 2 or len(ev_list) >= 3:
                sample_ev = ev_list[0]
                study_objs = [await self.study_repo.get_by_id(sid) for sid in studies]
                study_protocols = [s.protocol_number for s in study_objs if s]

                flag_msg = (
                    f"Flagged because event '{sample_ev.event_term}' occurred in {len(studies)} independent "
                    f"studies across {max(len(sites), 1)} sites ({len(ev_list)} total reports)."
                )

                signals.append(CrossTrialSignal(
                    event_term=sample_ev.event_term,
                    intervention=sample_ev.intervention,
                    affected_studies_count=len(studies),
                    affected_sites_count=max(len(sites), 1),
                    reports_count=len(ev_list),
                    trend="Increasing" if len(ev_list) >= 4 else "Stable",
                    status="Under Review",
                    studies=study_protocols,
                    flag_reason=flag_msg
                ))

        return signals
