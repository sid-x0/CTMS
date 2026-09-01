from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.repositories.study_repo import StudyRepository
from app.models.study import Study, StudyStatus
from app.schemas.study import StudyCreate, StudyUpdate, StudyOut
from app.audit.logger import log_audit_event

class StudyService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.study_repo = StudyRepository(db)

    async def get_study(self, study_id: int) -> StudyOut:
        study = await self.study_repo.get_by_id(study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")
        
        recruitment_pct = round((study.current_enrollment / study.target_enrollment * 100), 2) if study.target_enrollment > 0 else 0.0
        out = StudyOut.model_validate(study)
        out.recruitment_percentage = recruitment_pct
        return out

    async def list_studies(
        self, 
        skip: int = 0, 
        limit: int = 100, 
        status_filter: Optional[str] = None, 
        search: Optional[str] = None
    ) -> List[StudyOut]:
        studies = await self.study_repo.get_all(skip=skip, limit=limit, status=status_filter, search=search)
        results = []
        for study in studies:
            recruitment_pct = round((study.current_enrollment / study.target_enrollment * 100), 2) if study.target_enrollment > 0 else 0.0
            out = StudyOut.model_validate(study)
            out.recruitment_percentage = recruitment_pct
            results.append(out)
        return results

    async def create_study(self, study_data: StudyCreate, current_user: any) -> StudyOut:
        existing = await self.study_repo.get_by_protocol(study_data.protocol_number)
        if existing:
            raise HTTPException(status_code=400, detail=f"Protocol number {study_data.protocol_number} already exists")

        study = Study(**study_data.model_dump())
        created_study = await self.study_repo.create(study)

        # Audit event
        await log_audit_event(
            db=self.db,
            action="CREATE",
            entity_type="Study",
            entity_id=str(created_study.id),
            description=f"Created clinical study '{created_study.protocol_number}: {created_study.short_title}'",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            new_value=study_data.model_dump(mode="json")
        )

        return await self.get_study(created_study.id)

    async def update_study(self, study_id: int, update_data: StudyUpdate, current_user: any) -> StudyOut:
        study = await self.study_repo.get_by_id(study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")

        prev_dict = {
            "title": study.title,
            "status": study.status,
            "target_enrollment": study.target_enrollment
        }

        changes = update_data.model_dump(exclude_unset=True)
        for key, value in changes.items():
            setattr(study, key, value)

        updated_study = await self.study_repo.update(study)

        # Audit log event
        action = "STATUS_CHANGE" if "status" in changes else "UPDATE"
        await log_audit_event(
            db=self.db,
            action=action,
            entity_type="Study",
            entity_id=str(updated_study.id),
            description=f"Updated study {updated_study.protocol_number} ({', '.join(changes.keys())})",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            previous_value=prev_dict,
            new_value=changes
        )

        return await self.get_study(updated_study.id)
