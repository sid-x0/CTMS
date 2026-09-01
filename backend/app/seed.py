import asyncio
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal, engine
from app.models import (
    Base, User, UserRole, Study, StudyStatus, Site, 
    Participant, ParticipantStatus, StudyMilestone, MilestoneStatus, 
    AuditLog, Alert, SafetyEvent
)
from app.core.security import get_password_hash

async def seed_data():
    print("Initializing Database Schema...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("Seeding Users...")
        default_pwd = get_password_hash("Password123!")

        users_data = [
            {"name": "Dr. Tanuja Nesari", "email": "admin@aiia.gov.in", "role": UserRole.ADMINISTRATOR.value, "org": "All India Institute of Ayurveda"},
            {"name": "Dr. Mahesh Vyas", "email": "pi@aiia.gov.in", "role": UserRole.PRINCIPAL_INVESTIGATOR.value, "org": "AIIA Research Division"},
            {"name": "Dr. Anup Thakar", "email": "pi.jamnagar@aiia.gov.in", "role": UserRole.PRINCIPAL_INVESTIGATOR.value, "org": "ITRA Jamnagar"},
            {"name": "Priya Sharma", "email": "coordinator@aiia.gov.in", "role": UserRole.STUDY_COORDINATOR.value, "org": "AIIA Clinical Trial Unit"},
            {"name": "Rajesh Kumar", "email": "monitor@cro.org", "role": UserRole.CLINICAL_TRIAL_MONITOR.value, "org": "Ayush CRO Services"},
            {"name": "Dr. S. K. Gupta", "email": "ethics@aiia.gov.in", "role": UserRole.ETHICS_COMMITTEE_MEMBER.value, "org": "AIIA Institutional Ethics Committee"},
            {"name": "Dr. Vikram Singh", "email": "pv@aiia.gov.in", "role": UserRole.PHARMACOVIGILANCE_USER.value, "org": "National Pharmacovigilance Center"},
            {"name": "Inspector R. C. Verma", "email": "regulator@ayush.gov.in", "role": UserRole.REGULATOR.value, "org": "Ministry of Ayush Regulatory Body"},
        ]

        created_users = []
        for u in users_data:
            user = User(
                name=u["name"],
                email=u["email"],
                password_hash=default_pwd,
                role=u["role"],
                organization=u["org"],
                active=True
            )
            db.add(user)
            created_users.append(user)
        
        await db.commit()

        print("Seeding Clinical Studies...")
        today = date.today()

        studies_data = [
            {
                "protocol_number": "AYU-CT-2025-001",
                "title": "Efficacy and Safety of Ashwagandha (Withania somnifera) Extract in Managing Chronic Fatigue Syndrome: A Double-Blind Randomized Controlled Trial",
                "short_title": "Ashwagandha Chronic Fatigue Trial",
                "study_type": "Interventional",
                "intervention_type": "Ashwagandha Standardized Extract",
                "phase": "Phase 3",
                "sponsor": "Ministry of Ayush / AIIA",
                "pi": "Dr. Mahesh Vyas",
                "target": 150,
                "current": 112,
                "status": StudyStatus.RECRUITING.value,
                "start_date": today - timedelta(days=120),
                "exp_end": today + timedelta(days=245),
                "desc": "Evaluating standardization, efficacy and immunological safety of Ashwagandha standardized extract against placebo.",
                "deviations": 2,
                "queries": 4
            },
            {
                "protocol_number": "AYU-CT-2025-002",
                "title": "Comparative Evaluation of Curcumin Complex vs Standard NSAID Therapy in Knee Osteoarthritis: Multicenter Phase 2 Study",
                "short_title": "Curcumin Osteoarthritis Trial",
                "study_type": "Interventional",
                "intervention_type": "Curcumin Complex",
                "phase": "Phase 2",
                "sponsor": "AIIA Research Foundation",
                "pi": "Dr. Anup Thakar",
                "target": 200,
                "current": 165,
                "status": StudyStatus.ACTIVE.value,
                "start_date": today - timedelta(days=200),
                "exp_end": today + timedelta(days=165),
                "desc": "Multicenter evaluation assessing WOMAC joint pain index, inflammatory markers (IL-6, TNF-alpha) and radiological outcomes.",
                "deviations": 1,
                "queries": 2
            },
            {
                "protocol_number": "AYU-CT-2025-003",
                "title": "Multi-Herb Ayurvedic Formulation (AYUSH-64) for Mild-to-Moderate Viral Upper Respiratory Tract Infections",
                "short_title": "AYUSH-64 Respiratory Trial",
                "study_type": "Interventional",
                "intervention_type": "AYUSH-64 Formulation",
                "phase": "Phase 4",
                "sponsor": "CCRAS & AIIA",
                "pi": "Dr. Mahesh Vyas",
                "target": 300,
                "current": 300,
                "status": StudyStatus.COMPLETED.value,
                "start_date": today - timedelta(days=365),
                "exp_end": today - timedelta(days=30),
                "desc": "Post-market observational and interventional evaluation of recovery duration and symptom resolution.",
                "deviations": 0,
                "queries": 0
            },
            {
                "protocol_number": "AYU-CT-2025-004",
                "title": "Brahmi (Bacopa monnieri) Nootropic Action on Cognitive Decline and Memory Retention in Elderly Subjects",
                "short_title": "Brahmi Cognitive Health Study",
                "study_type": "Interventional",
                "intervention_type": "Brahmi Nootropic Extract",
                "phase": "Phase 2",
                "sponsor": "AIIA Neurological Center",
                "pi": "Dr. Mahesh Vyas",
                "target": 120,
                "current": 45,
                "status": StudyStatus.RECRUITING.value,
                "start_date": today - timedelta(days=60),
                "exp_end": today + timedelta(days=300),
                "desc": "Randomized controlled trial assessing MMSE scores, fMRI memory activation and serum BDNF levels.",
                "deviations": 3,
                "queries": 6
            },
            {
                "protocol_number": "AYU-CT-2025-005",
                "title": "Evaluation of Triphala Churna Rasayana in Metabolic Syndrome and Dyslipidemia Management",
                "short_title": "Triphala Metabolic Study",
                "study_type": "Observational",
                "intervention_type": "Triphala Churna Rasayana",
                "phase": "Phase 1",
                "sponsor": "AIIA Department of Kaya Chikitsa",
                "pi": "Dr. Anup Thakar",
                "target": 80,
                "current": 0,
                "status": StudyStatus.PENDING_IEC.value,
                "start_date": today + timedelta(days=30),
                "exp_end": today + timedelta(days=210),
                "desc": "Investigating lipid profile modulation, gut microbiome alteration, and glycation control.",
                "deviations": 0,
                "queries": 1
            },
            {
                "protocol_number": "AYU-CT-2025-006",
                "title": "Guduchi (Tinospora cordifolia) Immunomodulatory Response in Type-2 Diabetes Subjects",
                "short_title": "Guduchi Immune Diabetes Trial",
                "study_type": "Interventional",
                "intervention_type": "Guduchi Extract",
                "phase": "Phase 2",
                "sponsor": "National Institute of Ayurveda",
                "pi": "Dr. Mahesh Vyas",
                "target": 120,
                "current": 71,
                "status": StudyStatus.RECRUITING.value,
                "start_date": today - timedelta(days=90),
                "exp_end": today + timedelta(days=270),
                "desc": "Evaluating NK cell activity and glycemic control under Guduchi extract adjuvant therapy.",
                "deviations": 4,
                "queries": 8
            }
        ]

        created_studies = []
        for s in studies_data:
            study = Study(
                protocol_number=s["protocol_number"],
                title=s["title"],
                short_title=s["short_title"],
                study_type=s["study_type"],
                intervention_type=s["intervention_type"],
                phase=s["phase"],
                sponsor=s["sponsor"],
                principal_investigator=s["pi"],
                target_enrollment=s["target"],
                current_enrollment=s["current"],
                status=s["status"],
                start_date=s["start_date"],
                expected_end_date=s["exp_end"],
                description=s["desc"],
                protocol_deviations_count=s["deviations"],
                open_data_queries_count=s["queries"]
            )
            db.add(study)
            created_studies.append(study)
        
        await db.commit()

        print("Seeding Clinical Sites...")
        sites_data = [
            # Study 1
            {"study_idx": 0, "name": "AIIA Main Campus Clinical Center", "code": "SITE-AIIA-01", "inst": "All India Institute of Ayurveda", "loc": "New Delhi", "inv": "Dr. Mahesh Vyas", "target": 75, "current": 62, "status": "Active"},
            {"study_idx": 0, "name": "BHU Faculty of Ayurveda Site", "code": "SITE-BHU-02", "inst": "Banaras Hindu University", "loc": "Varanasi, UP", "inv": "Dr. K. N. Dwivedi", "target": 75, "current": 50, "status": "Active"},
            
            # Study 2
            {"study_idx": 1, "name": "ITRA Clinical Trial Site A", "code": "SITE-ITRA-01", "inst": "Institute of Teaching and Research in Ayurveda", "loc": "Jamnagar, Gujarat", "inv": "Dr. Anup Thakar", "target": 100, "current": 90, "status": "Active"},
            {"study_idx": 1, "name": "NIA Jaipur Research Clinic", "code": "SITE-NIA-02", "inst": "National Institute of Ayurveda", "loc": "Jaipur, Rajasthan", "inv": "Dr. Sanjeev Sharma", "target": 100, "current": 75, "status": "Active"},

            # Study 3
            {"study_idx": 2, "name": "AIIA Emergency & OPD Unit", "code": "SITE-AIIA-02", "inst": "All India Institute of Ayurveda", "loc": "New Delhi", "inv": "Dr. Mahesh Vyas", "target": 150, "current": 150, "status": "Closed"},
            {"study_idx": 2, "name": "Government Ayurveda Hospital Site", "code": "SITE-GAH-01", "inst": "Govt Ayurveda Hospital", "loc": "Lucknow, UP", "inv": "Dr. R. K. Singh", "target": 150, "current": 150, "status": "Closed"},

            # Study 4
            {"study_idx": 3, "name": "AIIA Memory & Neuro Clinic", "code": "SITE-AIIA-03", "inst": "All India Institute of Ayurveda", "loc": "New Delhi", "inv": "Dr. Mahesh Vyas", "target": 60, "current": 30, "status": "Active"},
            {"study_idx": 3, "name": "KAHER Ayurveda Hospital", "code": "SITE-KLE-01", "inst": "KLE Academy of Higher Education", "loc": "Belagavi, Karnataka", "inv": "Dr. B. S. Prasad", "target": 60, "current": 15, "status": "Active"},

            # Study 6 (Guduchi)
            {"study_idx": 5, "name": "AIIA Diabetes Clinic", "code": "SITE-AIIA-04", "inst": "All India Institute of Ayurveda", "loc": "New Delhi", "inv": "Dr. Mahesh Vyas", "target": 60, "current": 50, "status": "Active"},
            {"study_idx": 5, "name": "Govt Ayurveda College Trivandrum", "code": "SITE-GAC-01", "inst": "Govt Ayurveda College", "loc": "Thiruvananthapuram, Kerala", "inv": "Dr. P. R. Ramesh", "target": 60, "current": 21, "status": "Active"}
        ]

        created_sites = []
        for st in sites_data:
            study_obj = created_studies[st["study_idx"]]
            site = Site(
                study_id=study_obj.id,
                site_name=st["name"],
                site_code=st["code"],
                institution=st["inst"],
                location=st["loc"],
                investigator=st["inv"],
                activation_date=today - timedelta(days=90),
                status=st["status"],
                target_enrollment=st["target"],
                current_enrollment=st["current"]
            )
            db.add(site)
            created_sites.append(site)

        await db.commit()

        print("Seeding Participants...")
        participant_count = 0
        study1 = created_studies[0]
        site1 = created_sites[0]
        site2 = created_sites[1]

        for i in range(1, 45):
            p = Participant(
                study_id=study1.id,
                site_id=site1.id,
                participant_code=f"ASH-DEL-{i:03d}",
                status=ParticipantStatus.RANDOMIZED.value if i % 2 == 0 else ParticipantStatus.ENROLLED.value,
                screening_date=today - timedelta(days=100 - i),
                enrollment_date=today - timedelta(days=90 - i),
                randomization_date=today - timedelta(days=80 - i) if i % 2 == 0 else None,
                notes="Completed baseline lab tests."
            )
            db.add(p)
            participant_count += 1

        await db.commit()

        print("Seeding Study Milestones...")
        milestones_data = [
            {"study_idx": 0, "type": "Protocol Finalized", "name": "Final Protocol Approval by Scientific Advisory", "plan": today - timedelta(days=150), "actual": today - timedelta(days=148), "status": MilestoneStatus.COMPLETED.value},
            {"study_idx": 0, "type": "IEC Submission", "name": "Institutional Ethics Committee Submission", "plan": today - timedelta(days=140), "actual": today - timedelta(days=138), "status": MilestoneStatus.COMPLETED.value},
            {"study_idx": 0, "type": "IEC Approval", "name": "Formal Ethics Clearance Certificate Issued", "plan": today - timedelta(days=130), "actual": today - timedelta(days=125), "status": MilestoneStatus.COMPLETED.value},
            {"study_idx": 0, "type": "CTRI Registration", "name": "CTRI Public Registry Entry (CTRI/2025/08/04512)", "plan": today - timedelta(days=120), "actual": today - timedelta(days=118), "status": MilestoneStatus.COMPLETED.value},
            
            # Study 2
            {"study_idx": 1, "type": "IEC Approval Renewal", "name": "Annual IEC Approval Renewal", "plan": today + timedelta(days=6), "actual": None, "status": MilestoneStatus.PENDING.value},
            
            # Study 4 (Brahmi Overdue Milestone)
            {"study_idx": 3, "type": "Site Activation", "name": "Secondary Site KLE Belagavi Activation", "plan": today - timedelta(days=15), "actual": None, "status": MilestoneStatus.OVERDUE.value, "notes": "Site agreement pending legal signature."}
        ]

        for m in milestones_data:
            study_obj = created_studies[m["study_idx"]]
            milestone = StudyMilestone(
                study_id=study_obj.id,
                milestone_type=m["type"],
                name=m["name"],
                planned_date=m["plan"],
                actual_date=m["actual"],
                status=m["status"],
                notes=m.get("notes")
            )
            db.add(milestone)

        await db.commit()

        print("Seeding Safety Events (NPvCC Pharmacovigilance Integration)...")
        safety_events = [
            SafetyEvent(
                study_id=created_studies[0].id,
                site_id=created_sites[0].id,
                participant_code="ASH-DEL-012",
                event_term="Transaminase Elevation (ALT > 3x ULN)",
                ayurvedic_concept="Yakrit Roga / Pitta Dushti",
                intervention="Ashwagandha Standardized Extract",
                event_type="SAE",
                severity="Severe",
                seriousness=True,
                causality="Possible",
                onset_date=today - timedelta(days=2),
                reporting_deadline=today + timedelta(hours=17),
                status="Under Review",
                description="Subject experienced ALT 185 U/L following 6 weeks of trial medication. Expedited filing required."
            ),
            SafetyEvent(
                study_id=created_studies[1].id,
                site_id=created_sites[2].id,
                participant_code="CUR-JAM-045",
                event_term="Nausea & Dyspepsia",
                ayurvedic_concept="Aruchi / Agnimandya",
                intervention="Curcumin Complex",
                event_type="AE",
                severity="Moderate",
                seriousness=False,
                causality="Probable",
                onset_date=today - timedelta(days=10),
                reporting_deadline=today + timedelta(days=5),
                status="Under Review",
                description="Mild nausea after post-breakfast dosage. Resolved with water intake."
            ),
            SafetyEvent(
                study_id=created_studies[2].id,
                site_id=created_sites[4].id,
                participant_code="AYU-DEL-102",
                event_term="Nausea & Gastric Distress",
                ayurvedic_concept="Aruchi",
                intervention="Curcumin Complex",
                event_type="AE",
                severity="Mild",
                seriousness=False,
                causality="Possible",
                onset_date=today - timedelta(days=18),
                reporting_deadline=today + timedelta(days=12),
                status="Reported to IEC/DCGI",
                description="Transient nausea observed in 2 trial subjects."
            ),
            SafetyEvent(
                study_id=created_studies[3].id,
                site_id=created_sites[6].id,
                participant_code="BRA-DEL-009",
                event_term="Nausea & Epigastric Discomfort",
                ayurvedic_concept="Aruchi",
                intervention="Curcumin Complex",
                event_type="AE",
                severity="Moderate",
                seriousness=False,
                causality="Possible",
                onset_date=today - timedelta(days=5),
                reporting_deadline=today + timedelta(days=7),
                status="Under Review",
                description="Reported mild nausea following morning dose."
            )
        ]

        for se in safety_events:
            db.add(se)

        await db.commit()

        print("Seeding Audit Trail Events...")
        audit_events = [
            ("LOGIN", "Auth", "1", "admin@aiia.gov.in", UserRole.ADMINISTRATOR.value, "User admin@aiia.gov.in logged in successfully."),
            ("CREATE", "Study", "1", "pi@aiia.gov.in", UserRole.PRINCIPAL_INVESTIGATOR.value, "Created clinical study 'AYU-CT-2025-001: Ashwagandha Chronic Fatigue Trial'"),
            ("STATUS_CHANGE", "Study", "1", "admin@aiia.gov.in", UserRole.ADMINISTRATOR.value, "Study AYU-CT-2025-001 status changed from 'Draft' to 'Recruiting'"),
            ("CREATE", "SafetyEvent", "1", "pv@aiia.gov.in", UserRole.PHARMACOVIGILANCE_USER.value, "Recorded Serious Adverse Event (SAE) 'Transaminase Elevation' for subject ASH-DEL-012")
        ]

        for ev in audit_events:
            log = AuditLog(
                timestamp=datetime.now(timezone.utc) - timedelta(hours=len(audit_events) * 2),
                action=ev[0],
                entity_type=ev[1],
                entity_id=ev[2],
                user_email=ev[3],
                user_role=ev[4],
                description=ev[5]
            )
            db.add(log)

        await db.commit()
        print("SEEDING COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(seed_data())
