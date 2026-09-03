from typing import List, Optional
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.participant_repo import ParticipantRepository
from app.repositories.site_repo import SiteRepository
from app.repositories.study_repo import StudyRepository
from app.models.participant import Participant, ParticipantStatus, ConsentStatus
from app.schemas.participant import ParticipantCreate, ParticipantStatusUpdate, ConsentUpdate, ParticipantOut
from app.audit.logger import log_audit_event

VALID_TRANSITIONS = {
    ParticipantStatus.SCREENED.value: [ParticipantStatus.ELIGIBLE.value, ParticipantStatus.SCREEN_FAILURE.value, ParticipantStatus.WITHDRAWN.value],
    ParticipantStatus.ELIGIBLE.value: [ParticipantStatus.ENROLLED.value, ParticipantStatus.WITHDRAWN.value],
    ParticipantStatus.ENROLLED.value: [ParticipantStatus.RANDOMIZED.value, ParticipantStatus.COMPLETED.value, ParticipantStatus.WITHDRAWN.value],
    ParticipantStatus.RANDOMIZED.value: [ParticipantStatus.COMPLETED.value, ParticipantStatus.WITHDRAWN.value],
    ParticipantStatus.SCREEN_FAILURE.value: [],
    ParticipantStatus.WITHDRAWN.value: [],
    ParticipantStatus.COMPLETED.value: []
}

# Statuses that are terminal/inactive for consent-withdrawn participants
WITHDRAWN_CONSENT_BLOCKED_TRANSITIONS = [
    ParticipantStatus.ENROLLED.value,
    ParticipantStatus.RANDOMIZED.value,
]


class ParticipantService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.participant_repo = ParticipantRepository(db)
        self.site_repo = SiteRepository(db)
        self.study_repo = StudyRepository(db)

    async def get_participant(self, participant_id: int) -> ParticipantOut:
        participant = await self.participant_repo.get_by_id(participant_id)
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")
        return ParticipantOut.model_validate(participant)

    async def list_participants_for_study(self, study_id: int, status_filter: Optional[str] = None) -> List[ParticipantOut]:
        participants = await self.participant_repo.get_by_study(study_id, status=status_filter)
        return [ParticipantOut.model_validate(p) for p in participants]

    async def create_participant(self, p_data: ParticipantCreate, current_user: any) -> ParticipantOut:
        study = await self.study_repo.get_by_id(p_data.study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")

        site = await self.site_repo.get_by_id(p_data.site_id)
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")

        if site.study_id != study.id:
            raise HTTPException(status_code=400, detail="Site does not belong to the specified study")

        existing = await self.participant_repo.get_by_code(p_data.participant_code)
        if existing:
            raise HTTPException(status_code=400, detail=f"Participant code '{p_data.participant_code}' already exists")

        today = date.today()
        participant = Participant(
            study_id=p_data.study_id,
            site_id=p_data.site_id,
            participant_code=p_data.participant_code,
            status=ParticipantStatus.SCREENED.value,
            screening_date=today,
            consent_status=p_data.consent_status,
            consent_date=p_data.consent_date,
            consent_version=p_data.consent_version,
            notes=p_data.notes
        )

        created = await self.participant_repo.create(participant)

        await log_audit_event(
            db=self.db,
            action="CREATE",
            entity_type="Participant",
            entity_id=str(created.id),
            description=f"Screened new participant '{created.participant_code}' at site '{site.site_code}' for study {study.protocol_number}",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            new_value={"participant_code": created.participant_code, "status": created.status, "consent_status": created.consent_status}
        )

        return ParticipantOut.model_validate(created)

    async def update_consent(self, participant_id: int, consent_data: ConsentUpdate, current_user: any) -> ParticipantOut:
        """
        Record or update informed consent status for a participant.
        This is the correct path to set consent_status = OBTAINED before enrollment.
        """
        participant = await self.participant_repo.get_by_id(participant_id)
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")

        valid_consent_statuses = [c.value for c in ConsentStatus]
        if consent_data.consent_status not in valid_consent_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid consent_status. Must be one of: {valid_consent_statuses}"
            )

        prev_consent = participant.consent_status
        participant.consent_status = consent_data.consent_status
        if consent_data.consent_date:
            participant.consent_date = consent_data.consent_date
        if consent_data.consent_version:
            participant.consent_version = consent_data.consent_version
        if consent_data.notes:
            participant.notes = (participant.notes or "") + f"\n[Consent Update] {consent_data.notes}"

        updated = await self.participant_repo.update(participant)

        await log_audit_event(
            db=self.db,
            action="CONSENT_UPDATE",
            entity_type="Participant",
            entity_id=str(updated.id),
            description=f"Informed consent status for participant '{updated.participant_code}' changed from '{prev_consent}' to '{consent_data.consent_status}'",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            previous_value={"consent_status": prev_consent},
            new_value={"consent_status": consent_data.consent_status, "consent_version": consent_data.consent_version}
        )

        return ParticipantOut.model_validate(updated)

    async def update_participant_status(self, participant_id: int, update_data: ParticipantStatusUpdate, current_user: any) -> ParticipantOut:
        participant = await self.participant_repo.get_by_id(participant_id)
        if not participant:
            raise HTTPException(status_code=404, detail="Participant not found")

        current_status = participant.status
        target_status = update_data.status

        if target_status == current_status:
            return ParticipantOut.model_validate(participant)

        allowed = VALID_TRANSITIONS.get(current_status, [])
        if target_status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid state transition: Cannot change participant status from '{current_status}' to '{target_status}'. Allowed transitions: {allowed}"
            )

        # ---------------------------------------------------------------
        # INFORMED CONSENT ENFORCEMENT (business rule)
        # A participant MUST have consent_status == OBTAINED before
        # transitioning to ENROLLED status.
        # ---------------------------------------------------------------
        if target_status == ParticipantStatus.ENROLLED.value:
            if participant.consent_status != ConsentStatus.OBTAINED.value:
                # Record the rejected attempt in audit trail
                await log_audit_event(
                    db=self.db,
                    action="ENROLLMENT_REJECTED",
                    entity_type="Participant",
                    entity_id=str(participant.id),
                    description=(
                        f"Enrollment rejected for participant '{participant.participant_code}': "
                        f"consent_status is '{participant.consent_status}'. "
                        f"Informed consent must be OBTAINED before enrollment."
                    ),
                    user_id=current_user.id,
                    user_email=current_user.email,
                    user_role=current_user.role,
                    previous_value={"status": current_status, "consent_status": participant.consent_status},
                    new_value={"attempted_status": target_status, "blocked_reason": "consent_not_obtained"}
                )
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Enrollment blocked: participant '{participant.participant_code}' "
                        f"has consent_status='{participant.consent_status}'. "
                        f"Informed consent (consent_status=OBTAINED) must be recorded before enrollment."
                    )
                )

        # Block further enrollment/randomization if consent was withdrawn
        if participant.consent_status == ConsentStatus.WITHDRAWN.value and target_status in WITHDRAWN_CONSENT_BLOCKED_TRANSITIONS:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Transition to '{target_status}' is blocked: participant '{participant.participant_code}' "
                    f"has withdrawn consent. Only withdrawal or completion allowed."
                )
            )

        prev_status = participant.status
        participant.status = target_status
        event_date = update_data.event_date or date.today()

        if target_status == ParticipantStatus.ENROLLED.value:
            participant.enrollment_date = event_date
            # Recalculate and update current_enrollment for site and study
            site = await self.site_repo.get_by_id(participant.site_id)
            study = await self.study_repo.get_by_id(participant.study_id)
            if site:
                site.current_enrollment += 1
                await self.site_repo.update(site)
            if study:
                study.current_enrollment += 1
                await self.study_repo.update(study)

        elif target_status == ParticipantStatus.RANDOMIZED.value:
            participant.randomization_date = event_date
        elif target_status == ParticipantStatus.COMPLETED.value:
            participant.completion_date = event_date
        elif target_status == ParticipantStatus.WITHDRAWN.value:
            participant.withdrawal_date = event_date

        if update_data.notes:
            participant.notes = (participant.notes or "") + f"\n[{event_date}] Status changed to {target_status}: {update_data.notes}"

        updated = await self.participant_repo.update(participant)

        await log_audit_event(
            db=self.db,
            action="STATUS_CHANGE",
            entity_type="Participant",
            entity_id=str(updated.id),
            description=f"Participant '{updated.participant_code}' status transitioned from '{prev_status}' to '{target_status}'",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            previous_value={"status": prev_status},
            new_value={"status": target_status, "event_date": str(event_date)}
        )

        return ParticipantOut.model_validate(updated)
