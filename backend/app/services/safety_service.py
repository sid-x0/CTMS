from datetime import datetime, timezone
from typing import List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.safety_repo import SafetyRepository
from app.repositories.study_repo import StudyRepository
from app.repositories.alert_repo import AlertRepository
from app.models.safety import SafetyEvent
from app.schemas.safety import SafetyEventCreate, SafetyEventOut, CrossTrialSignal
from app.audit.logger import log_audit_event


class SafetyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.safety_repo = SafetyRepository(db)
        self.study_repo = StudyRepository(db)
        self.alert_repo = AlertRepository(db)

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

    async def review_safety_event(self, event_id: int, new_status: str, current_user: any) -> SafetyEventOut:
        """
        Update safety event status (e.g., 'Under Review' → 'Reported to IEC/DCGI').
        Creates audit log. Marks related alerts as read/resolved.
        """
        event = await self.safety_repo.get_by_id(event_id)
        if not event:
            raise HTTPException(status_code=404, detail="Safety event not found")

        valid_statuses = ["Under Review", "Reported to IEC/DCGI", "Closed"]
        if new_status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

        old_status = event.status
        event.status = new_status
        event.updated_at = datetime.now(timezone.utc)
        await self.db.commit()
        await self.db.refresh(event)

        # Mark related SAE_DEADLINE alerts as read/resolved
        study_alerts = await self.alert_repo.get_by_study(event.study_id)
        for alert in study_alerts:
            if alert.alert_type == "SAE_DEADLINE" and not alert.is_read:
                alert.is_read = True
                alert.is_resolved = True

        await self.db.commit()

        # Audit trail
        study = await self.study_repo.get_by_id(event.study_id)
        protocol = study.protocol_number if study else f"Study #{event.study_id}"
        await log_audit_event(
            db=self.db,
            action="STATUS_CHANGE",
            entity_type="SafetyEvent",
            entity_id=str(event.id),
            description=f"Safety Event '{event.event_term}' (subject {event.participant_code or 'N/A'}) in {protocol} status changed from '{old_status}' to '{new_status}'.",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            previous_value=old_status,
            new_value=new_status
        )

        return SafetyEventOut.model_validate(event)

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

            # Signal threshold: >= 2 studies OR >= 3 reports
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
