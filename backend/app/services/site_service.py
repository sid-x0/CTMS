from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.repositories.site_repo import SiteRepository
from app.repositories.study_repo import StudyRepository
from app.models.site import Site
from app.schemas.site import SiteCreate, SiteUpdate, SiteOut
from app.audit.logger import log_audit_event

class SiteService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.site_repo = SiteRepository(db)
        self.study_repo = StudyRepository(db)

    async def get_site(self, site_id: int) -> SiteOut:
        site = await self.site_repo.get_by_id(site_id)
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")
        recruitment_pct = round((site.current_enrollment / site.target_enrollment * 100), 2) if site.target_enrollment > 0 else 0.0
        out = SiteOut.model_validate(site)
        out.recruitment_percentage = recruitment_pct
        return out

    async def list_sites_for_study(self, study_id: int) -> List[SiteOut]:
        sites = await self.site_repo.get_by_study(study_id)
        results = []
        for site in sites:
            recruitment_pct = round((site.current_enrollment / site.target_enrollment * 100), 2) if site.target_enrollment > 0 else 0.0
            out = SiteOut.model_validate(site)
            out.recruitment_percentage = recruitment_pct
            results.append(out)
        return results

    async def create_site(self, site_data: SiteCreate, current_user: any) -> SiteOut:
        study = await self.study_repo.get_by_id(site_data.study_id)
        if not study:
            raise HTTPException(status_code=404, detail="Study not found")

        existing = await self.site_repo.get_by_code(site_data.study_id, site_data.site_code)
        if existing:
            raise HTTPException(status_code=400, detail=f"Site code {site_data.site_code} already exists for this study")

        site = Site(**site_data.model_dump())
        created_site = await self.site_repo.create(site)

        # Audit log event
        await log_audit_event(
            db=self.db,
            action="CREATE",
            entity_type="Site",
            entity_id=str(created_site.id),
            description=f"Added site '{created_site.site_name}' ({created_site.site_code}) to study {study.protocol_number}",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            new_value=site_data.model_dump(mode="json")
        )

        return await self.get_site(created_site.id)

    async def update_site(self, site_id: int, update_data: SiteUpdate, current_user: any) -> SiteOut:
        site = await self.site_repo.get_by_id(site_id)
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")

        prev_dict = {
            "site_name": site.site_name,
            "status": site.status,
            "target_enrollment": site.target_enrollment
        }

        changes = update_data.model_dump(exclude_unset=True)
        for key, value in changes.items():
            setattr(site, key, value)

        updated_site = await self.site_repo.update(site)

        await log_audit_event(
            db=self.db,
            action="UPDATE",
            entity_type="Site",
            entity_id=str(updated_site.id),
            description=f"Updated site {updated_site.site_code} ({', '.join(changes.keys())})",
            user_id=current_user.id,
            user_email=current_user.email,
            user_role=current_user.role,
            previous_value=prev_dict,
            new_value=changes
        )

        return await self.get_site(updated_site.id)
