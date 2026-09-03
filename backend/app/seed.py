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
            # Study 0 — index 0
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
            # Study 1 — index 1
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
            # Study 2 — index 2
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
            # Study 3 — index 3
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
            # Study 4 — index 4  (Triphala — Pending IEC, has CTRI milestone Pending for demo)
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
            # Study 5 — index 5  (Guduchi — PRIMARY DEMO STUDY)
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
            # Study 0 (Ashwagandha)
            {"study_idx": 0, "name": "AIIA Main Campus Clinical Center", "code": "SITE-AIIA-01", "inst": "All India Institute of Ayurveda", "loc": "New Delhi", "inv": "Dr. Mahesh Vyas", "target": 75, "current": 62, "status": "Active", "days_ago": 110},
            {"study_idx": 0, "name": "BHU Faculty of Ayurveda Site", "code": "SITE-BHU-02", "inst": "Banaras Hindu University", "loc": "Varanasi, UP", "inv": "Dr. K. N. Dwivedi", "target": 75, "current": 50, "status": "Active", "days_ago": 110},

            # Study 1 (Curcumin)
            {"study_idx": 1, "name": "ITRA Clinical Trial Site A", "code": "SITE-ITRA-01", "inst": "Institute of Teaching and Research in Ayurveda", "loc": "Jamnagar, Gujarat", "inv": "Dr. Anup Thakar", "target": 100, "current": 90, "status": "Active", "days_ago": 190},
            {"study_idx": 1, "name": "NIA Jaipur Research Clinic", "code": "SITE-NIA-02", "inst": "National Institute of Ayurveda", "loc": "Jaipur, Rajasthan", "inv": "Dr. Sanjeev Sharma", "target": 100, "current": 75, "status": "Active", "days_ago": 190},

            # Study 2 (AYUSH-64 — Completed)
            {"study_idx": 2, "name": "AIIA Emergency & OPD Unit", "code": "SITE-AIIA-02", "inst": "All India Institute of Ayurveda", "loc": "New Delhi", "inv": "Dr. Mahesh Vyas", "target": 150, "current": 150, "status": "Closed", "days_ago": 355},
            {"study_idx": 2, "name": "Government Ayurveda Hospital Site", "code": "SITE-GAH-01", "inst": "Govt Ayurveda Hospital", "loc": "Lucknow, UP", "inv": "Dr. R. K. Singh", "target": 150, "current": 150, "status": "Closed", "days_ago": 355},

            # Study 3 (Brahmi)
            {"study_idx": 3, "name": "AIIA Memory & Neuro Clinic", "code": "SITE-AIIA-03", "inst": "All India Institute of Ayurveda", "loc": "New Delhi", "inv": "Dr. Mahesh Vyas", "target": 60, "current": 30, "status": "Active", "days_ago": 55},
            {"study_idx": 3, "name": "KAHER Ayurveda Hospital", "code": "SITE-KLE-01", "inst": "KLE Academy of Higher Education", "loc": "Belagavi, Karnataka", "inv": "Dr. B. S. Prasad", "target": 60, "current": 15, "status": "Active", "days_ago": 40},

            # Study 5 (Guduchi — PRIMARY DEMO)
            {"study_idx": 5, "name": "AIIA Diabetes & Endocrine Clinic", "code": "SITE-AIIA-04", "inst": "All India Institute of Ayurveda", "loc": "New Delhi", "inv": "Dr. Mahesh Vyas", "target": 60, "current": 50, "status": "Active", "days_ago": 85},
            {"study_idx": 5, "name": "Govt Ayurveda College Trivandrum", "code": "SITE-GAC-01", "inst": "Govt Ayurveda College", "loc": "Thiruvananthapuram, Kerala", "inv": "Dr. P. R. Ramesh", "target": 60, "current": 21, "status": "Active", "days_ago": 80},
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
                activation_date=today - timedelta(days=st["days_ago"]),
                status=st["status"],
                target_enrollment=st["target"],
                current_enrollment=st["current"]
            )
            db.add(site)
            created_sites.append(site)

        await db.commit()

        # Site index mapping for reference:
        # 0: AIIA Main (Ashwagandha), 1: BHU (Ashwagandha)
        # 2: ITRA (Curcumin), 3: NIA (Curcumin)
        # 4: AIIA OPD (AYUSH-64 closed), 5: GAH (AYUSH-64 closed)
        # 6: AIIA Neuro (Brahmi), 7: KLE (Brahmi)
        # 8: AIIA Diabetes (Guduchi), 9: GAC Trivandrum (Guduchi - underperforming)

        print("Seeding Participants...")

        # Study 0 (Ashwagandha) — site 0 (AIIA): 44 participants
        study1 = created_studies[0]
        site_aiia_ash = created_sites[0]
        site_bhu = created_sites[1]

        for i in range(1, 45):
            p = Participant(
                study_id=study1.id,
                site_id=site_aiia_ash.id,
                participant_code=f"ASH-DEL-{i:03d}",
                status=ParticipantStatus.RANDOMIZED.value if i % 2 == 0 else ParticipantStatus.ENROLLED.value,
                consent_status="OBTAINED",
                consent_date=today - timedelta(days=95 - i),
                consent_version="ICF-v1.2",
                screening_date=today - timedelta(days=100 - i),
                enrollment_date=today - timedelta(days=90 - i),
                randomization_date=today - timedelta(days=80 - i) if i % 2 == 0 else None,
                notes="Completed baseline lab tests."
            )
            db.add(p)

        # BHU site: 18 participants (partial)
        for i in range(1, 19):
            p = Participant(
                study_id=study1.id,
                site_id=site_bhu.id,
                participant_code=f"ASH-BHU-{i:03d}",
                status=ParticipantStatus.ENROLLED.value if i <= 15 else ParticipantStatus.WITHDRAWN.value,
                consent_status="OBTAINED" if i <= 15 else "WITHDRAWN",
                consent_date=today - timedelta(days=75 - i),
                consent_version="ICF-v1.2",
                screening_date=today - timedelta(days=80 - i),
                enrollment_date=today - timedelta(days=70 - i),
                notes="Site BHU participant."
            )
            db.add(p)

        # Demo participant: consent NOT_OBTAINED for TEST 4 verification
        p_demo = Participant(
            study_id=study1.id,
            site_id=site_aiia_ash.id,
            participant_code="ASH-DEL-DEMO",
            status=ParticipantStatus.ELIGIBLE.value,
            consent_status="NOT_OBTAINED",
            screening_date=today - timedelta(days=5),
            notes="Demo participant: consent not yet obtained. Use for Test 4 consent workflow verification."
        )
        db.add(p_demo)

        # Study 3 (Brahmi) — site 6 (AIIA Neuro): 30 participants
        study4 = created_studies[3]
        site_neuro = created_sites[6]
        site_kle = created_sites[7]

        for i in range(1, 31):
            p = Participant(
                study_id=study4.id,
                site_id=site_neuro.id,
                participant_code=f"BRA-DEL-{i:03d}",
                status=ParticipantStatus.ENROLLED.value if i <= 25 else ParticipantStatus.SCREENED.value,
                screening_date=today - timedelta(days=50 - i),
                enrollment_date=today - timedelta(days=40 - i) if i <= 25 else None,
                notes="Elderly subject. MMSE baseline assessed."
            )
            db.add(p)

        # KLE site: 15 participants
        for i in range(1, 16):
            p = Participant(
                study_id=study4.id,
                site_id=site_kle.id,
                participant_code=f"BRA-KLE-{i:03d}",
                status=ParticipantStatus.ENROLLED.value,
                screening_date=today - timedelta(days=35 - i),
                enrollment_date=today - timedelta(days=25 - i),
                notes="KLE Belagavi participant."
            )
            db.add(p)

        # Study 5 (Guduchi — PRIMARY DEMO) — site 8 (AIIA Diabetes): 50 participants
        study6 = created_studies[5]
        site_diab = created_sites[8]
        site_triv = created_sites[9]

        for i in range(1, 51):
            status = ParticipantStatus.RANDOMIZED.value if i <= 40 else ParticipantStatus.ENROLLED.value
            p = Participant(
                study_id=study6.id,
                site_id=site_diab.id,
                participant_code=f"GUD-DEL-{i:03d}",
                status=status,
                screening_date=today - timedelta(days=85 - i),
                enrollment_date=today - timedelta(days=75 - i),
                randomization_date=today - timedelta(days=65 - i) if i <= 40 else None,
                notes="T2DM subject. HbA1c baseline recorded."
            )
            db.add(p)

        # Trivandrum site: 21 participants (underperforming — only 35%)
        for i in range(1, 22):
            p = Participant(
                study_id=study6.id,
                site_id=site_triv.id,
                participant_code=f"GUD-TRV-{i:03d}",
                status=ParticipantStatus.ENROLLED.value if i <= 18 else ParticipantStatus.SCREEN_FAILURE.value,
                screening_date=today - timedelta(days=78 - i),
                enrollment_date=today - timedelta(days=68 - i) if i <= 18 else None,
                notes="Trivandrum site — recruitment lag noted."
            )
            db.add(p)

        await db.commit()

        print("Seeding Study Milestones...")
        milestones_data = [
            # ─── Study 0 (Ashwagandha) ───
            {"study_idx": 0, "type": "Protocol Finalized", "name": "Final Protocol Approval by Scientific Advisory", "plan": today - timedelta(days=150), "actual": today - timedelta(days=148), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 0, "type": "IEC Submission", "name": "Institutional Ethics Committee Submission", "plan": today - timedelta(days=140), "actual": today - timedelta(days=138), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 0, "type": "IEC Approval", "name": "Formal Ethics Clearance Certificate Issued", "plan": today - timedelta(days=130), "actual": today - timedelta(days=125), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 0, "type": "CTRI Registration", "name": "CTRI Public Registry Entry (CTRI/2025/08/04512)", "plan": today - timedelta(days=120), "actual": today - timedelta(days=118), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 0, "type": "Site Activation", "name": "AIIA Main Site Activation", "plan": today - timedelta(days=110), "actual": today - timedelta(days=108), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 0, "type": "Monitoring Visit", "name": "Q1 On-Site Monitoring Visit — BHU Varanasi", "plan": today - timedelta(days=20), "actual": None, "status": MilestoneStatus.OVERDUE.value, "notes": "Visit postponed due to site coordinator leave. Rescheduling required."},
            {"study_idx": 0, "type": "Interim Report", "name": "6-Month Interim Safety Report to IEC", "plan": today + timedelta(days=25), "actual": None, "status": MilestoneStatus.IN_PROGRESS.value, "notes": None},

            # ─── Study 1 (Curcumin) ───
            {"study_idx": 1, "type": "IEC Approval", "name": "Formal Ethics Clearance Certificate — ITRA", "plan": today - timedelta(days=210), "actual": today - timedelta(days=208), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 1, "type": "CTRI Registration", "name": "CTRI Public Registry — Curcumin OA Trial", "plan": today - timedelta(days=200), "actual": today - timedelta(days=198), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 1, "type": "IEC Approval Renewal", "name": "Annual IEC Approval Renewal — Ethics Committee Review", "plan": today + timedelta(days=6), "actual": None, "status": MilestoneStatus.PENDING.value, "notes": "Annual renewal deadline approaching. Paperwork in review."},
            {"study_idx": 1, "type": "Interim Report", "name": "Mid-Study Interim Analysis Report Submission", "plan": today + timedelta(days=30), "actual": None, "status": MilestoneStatus.PENDING.value, "notes": None},

            # ─── Study 2 (AYUSH-64 — Completed) ───
            {"study_idx": 2, "type": "IEC Approval", "name": "Ethics Clearance for AYUSH-64 Trial", "plan": today - timedelta(days=375), "actual": today - timedelta(days=373), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 2, "type": "CTRI Registration", "name": "CTRI Registry Entry — AYUSH-64", "plan": today - timedelta(days=365), "actual": today - timedelta(days=363), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 2, "type": "Trial Closure", "name": "Final Study Closure Report", "plan": today - timedelta(days=30), "actual": today - timedelta(days=28), "status": MilestoneStatus.COMPLETED.value, "notes": "Trial successfully completed. Final report submitted."},

            # ─── Study 3 (Brahmi) ───
            {"study_idx": 3, "type": "IEC Approval", "name": "Ethics Clearance — Brahmi Cognitive Trial", "plan": today - timedelta(days=70), "actual": today - timedelta(days=68), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 3, "type": "CTRI Registration", "name": "CTRI Registry Entry — Brahmi Cognitive Study", "plan": today - timedelta(days=65), "actual": today - timedelta(days=63), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 3, "type": "Site Activation", "name": "Secondary Site KLE Belagavi Full Activation", "plan": today - timedelta(days=15), "actual": None, "status": MilestoneStatus.OVERDUE.value, "notes": "Site agreement pending legal review. SOP training delayed by 15 days."},
            {"study_idx": 3, "type": "Monitoring Visit", "name": "Quarterly Monitoring Visit — KLE Belagavi", "plan": today - timedelta(days=10), "actual": None, "status": MilestoneStatus.OVERDUE.value, "notes": "Visit overdue. Last monitoring 120 days ago. Immediate rescheduling required."},
            {"study_idx": 3, "type": "Interim Report", "name": "3-Month Safety Update Report", "plan": today + timedelta(days=20), "actual": None, "status": MilestoneStatus.PENDING.value, "notes": None},

            # ─── Study 4 (Triphala — Pending IEC, CTRI NOT registered yet — for compliance demo) ───
            {"study_idx": 4, "type": "Protocol Finalized", "name": "Scientific Protocol Finalization", "plan": today - timedelta(days=20), "actual": today - timedelta(days=18), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 4, "type": "IEC Submission", "name": "Institutional Ethics Committee Submission — Triphala Trial", "plan": today - timedelta(days=10), "actual": today - timedelta(days=9), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 4, "type": "IEC Approval", "name": "IEC Ethics Clearance Certificate", "plan": today + timedelta(days=5), "actual": None, "status": MilestoneStatus.PENDING.value, "notes": "Under IEC review. Decision expected within 5 days."},
            # ⬇ This CTRI milestone is Pending — used in compliance demo to "resolve"
            {"study_idx": 4, "type": "CTRI Registration", "name": "CTRI Public Registry Entry — Triphala Metabolic Study", "plan": today + timedelta(days=15), "actual": None, "status": MilestoneStatus.PENDING.value, "notes": "CTRI registration form submitted. Awaiting registry confirmation number."},

            # ─── Study 5 (Guduchi — PRIMARY DEMO) ───
            {"study_idx": 5, "type": "IEC Approval", "name": "Institutional Ethics Clearance — Guduchi Immune Diabetes Trial", "plan": today - timedelta(days=100), "actual": today - timedelta(days=98), "status": MilestoneStatus.COMPLETED.value, "notes": "IEC clearance certificate no. AIIA-IEC-2025-064 issued."},
            {"study_idx": 5, "type": "CTRI Registration", "name": "CTRI Public Registry Entry (CTRI/2025/06/03782)", "plan": today - timedelta(days=92), "actual": today - timedelta(days=90), "status": MilestoneStatus.COMPLETED.value, "notes": "Registered under CTRI/2025/06/03782."},
            {"study_idx": 5, "type": "Site Activation", "name": "AIIA Diabetes Clinic Site Activation", "plan": today - timedelta(days=88), "actual": today - timedelta(days=86), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            {"study_idx": 5, "type": "Site Activation", "name": "Govt Ayurveda College Trivandrum Site Activation", "plan": today - timedelta(days=85), "actual": today - timedelta(days=82), "status": MilestoneStatus.COMPLETED.value, "notes": None},
            # ⬇ Overdue monitoring visit at Trivandrum — key operational problem for demo
            {"study_idx": 5, "type": "Monitoring Visit", "name": "Routine On-Site Monitoring Visit — GAC Trivandrum", "plan": today - timedelta(days=18), "actual": None, "status": MilestoneStatus.OVERDUE.value, "notes": "Monitoring visit 18 days overdue. Recruitment lag at this site suggests operational issues. Site investigator unreachable for scheduling."},
            {"study_idx": 5, "type": "Interim Report", "name": "3-Month Interim Safety & Efficacy Report", "plan": today + timedelta(days=12), "actual": None, "status": MilestoneStatus.IN_PROGRESS.value, "notes": "Data compilation in progress. NK cell assay results pending from lab."},
            {"study_idx": 5, "type": "Protocol Amendment", "name": "Protocol Amendment v1.1 — Dosage Clarification", "plan": today + timedelta(days=35), "actual": None, "status": MilestoneStatus.PENDING.value, "notes": None},
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

        print("Seeding Safety Events (NPvCC Pharmacovigilance)...")
        safety_events_data = [
            # Study 0 (Ashwagandha) — CRITICAL SAE
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
                description="Subject ASH-DEL-012 experienced ALT 185 U/L (3.2x ULN) following 6 weeks of trial medication. Expedited IEC/DCGI filing required within 24h."
            ),
            # Study 1 (Curcumin) — AE
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
                description="Mild nausea after post-breakfast dosage. Resolved with water intake within 2 hours."
            ),
            # Study 2 (AYUSH-64 completed)
            SafetyEvent(
                study_id=created_studies[2].id,
                site_id=created_sites[4].id,
                participant_code="AYU-DEL-102",
                event_term="Nausea & Gastric Distress",
                ayurvedic_concept="Aruchi",
                intervention="AYUSH-64 Formulation",
                event_type="AE",
                severity="Mild",
                seriousness=False,
                causality="Possible",
                onset_date=today - timedelta(days=18),
                reporting_deadline=today + timedelta(days=12),
                status="Reported to IEC/DCGI",
                description="Transient nausea observed in 2 trial subjects. Resolved spontaneously."
            ),
            # Study 3 (Brahmi)
            SafetyEvent(
                study_id=created_studies[3].id,
                site_id=created_sites[6].id,
                participant_code="BRA-DEL-009",
                event_term="Nausea & Epigastric Discomfort",
                ayurvedic_concept="Aruchi",
                intervention="Brahmi Nootropic Extract",
                event_type="AE",
                severity="Moderate",
                seriousness=False,
                causality="Possible",
                onset_date=today - timedelta(days=5),
                reporting_deadline=today + timedelta(days=7),
                status="Under Review",
                description="Reported mild nausea following morning dose. Subject continued trial."
            ),
            # Study 5 (Guduchi — PRIMARY DEMO SAE)
            SafetyEvent(
                study_id=created_studies[5].id,
                site_id=created_sites[8].id,
                participant_code="GUD-DEL-028",
                event_term="Elevated Hepatic Enzymes (ALT/AST > 2x ULN)",
                ayurvedic_concept="Yakrit Roga / Pitta Vriddhi",
                intervention="Guduchi Extract",
                event_type="SAE",
                severity="Severe",
                seriousness=True,
                causality="Possible",
                onset_date=today - timedelta(days=3),
                reporting_deadline=today + timedelta(days=1),
                status="Under Review",
                description="Subject GUD-DEL-028 (T2DM, 58yr M) reported ALT 142 U/L, AST 118 U/L at week-8 follow-up. Temporally associated with Guduchi extract dosing. Dose held pending investigation. IEC/DCGI filing required."
            ),
            # Study 5 (Guduchi) — additional AE at Trivandrum
            SafetyEvent(
                study_id=created_studies[5].id,
                site_id=created_sites[9].id,
                participant_code="GUD-TRV-007",
                event_term="Hypoglycaemic Episode (Mild)",
                ayurvedic_concept="Madhumeha Pratikriya",
                intervention="Guduchi Extract + Concurrent Anti-Diabetic",
                event_type="AE",
                severity="Mild",
                seriousness=False,
                causality="Probable",
                onset_date=today - timedelta(days=8),
                reporting_deadline=today + timedelta(days=7),
                status="Under Review",
                description="Subject on concurrent metformin experienced fasting blood glucose 62 mg/dL. Dose adjustment under consideration."
            ),
        ]

        for se in safety_events_data:
            db.add(se)

        await db.commit()

        print("Seeding Alerts...")
        alerts_data = [
            # Guduchi study — CRITICAL: SAE reporting deadline
            Alert(
                study_id=created_studies[5].id,
                site_id=created_sites[8].id,
                alert_type="SAE_DEADLINE",
                severity="CRITICAL",
                title="SAE Reporting Deadline — GUD-DEL-028 (24h)",
                message="Serious Adverse Event 'Elevated Hepatic Enzymes' for subject GUD-DEL-028 in Guduchi Immune Diabetes Trial requires expedited internal IEC review and prototype reporting transition. Reporting deadline within 24 hours of onset report.",
                is_read=False
            ),
            # Guduchi study — HIGH: Trivandrum recruitment lag
            Alert(
                study_id=created_studies[5].id,
                site_id=created_sites[9].id,
                alert_type="RECRUITMENT_LAG",
                severity="HIGH",
                title="Recruitment Deficit — GAC Trivandrum (35% of target)",
                message="Site GAC Trivandrum has enrolled only 21/60 subjects (35%) in the Guduchi Immune Diabetes Trial. Expected pace: 4.2/wk. Actual pace: 1.6/wk. Site performance review required.",
                is_read=False
            ),
            # Guduchi study — HIGH: Monitoring visit overdue
            Alert(
                study_id=created_studies[5].id,
                site_id=created_sites[9].id,
                alert_type="MONITORING_OVERDUE",
                severity="HIGH",
                title="Monitoring Visit 18 Days Overdue — GAC Trivandrum",
                message="Routine on-site monitoring visit for Guduchi Trial at Govt Ayurveda College Trivandrum is 18 days overdue. Last visit: 80 days ago. GCP-aligned protocol requires quarterly visits.",
                is_read=False
            ),
            # Ashwagandha study — CRITICAL: SAE reporting deadline
            Alert(
                study_id=created_studies[0].id,
                site_id=created_sites[0].id,
                alert_type="SAE_DEADLINE",
                severity="CRITICAL",
                title="SAE Reporting Deadline — ASH-DEL-012 (17h)",
                message="SAE 'Transaminase Elevation (ALT > 3x ULN)' for subject ASH-DEL-012 requires regulatory submission. 17 hours remaining for DCGI/IEC filing.",
                is_read=False
            ),
            # Curcumin study — HIGH: IEC Renewal
            Alert(
                study_id=created_studies[1].id,
                site_id=None,
                alert_type="IEC_RENEWAL",
                severity="HIGH",
                title="IEC Ethics Approval Renewal Due in 6 Days",
                message="Annual IEC renewal for Curcumin Osteoarthritis Trial expires in 6 days. Ethics committee renewal documentation must be submitted immediately to avoid trial suspension.",
                is_read=False
            ),
            # Brahmi study — HIGH: Site activation overdue
            Alert(
                study_id=created_studies[3].id,
                site_id=created_sites[7].id,
                alert_type="SITE_ACTIVATION_OVERDUE",
                severity="HIGH",
                title="KLE Belagavi Site Activation 15 Days Overdue",
                message="Secondary site KLE Belagavi full activation is 15 days overdue. Legal site agreement pending. Protocol deviations risk increasing until resolved.",
                is_read=False
            ),
            # Guduchi study — MEDIUM: Open data queries
            Alert(
                study_id=created_studies[5].id,
                site_id=None,
                alert_type="DATA_QUERIES",
                severity="WARNING",
                title="8 Open Data Queries — Guduchi Trial",
                message="Guduchi Immune Diabetes Trial has 8 unresolved data queries in the EDC system. Queries >30 days old. Data manager review required before interim report.",
                is_read=False
            ),
        ]

        for al in alerts_data:
            db.add(al)

        await db.commit()

        print("Seeding Audit Trail Events...")
        audit_ts_base = datetime.now(timezone.utc) - timedelta(hours=48)

        audit_events = [
            (audit_ts_base, "LOGIN", "Auth", "1", "admin@aiia.gov.in", UserRole.ADMINISTRATOR.value, None, None, "User admin@aiia.gov.in logged in successfully."),
            (audit_ts_base + timedelta(minutes=5), "CREATE", "Study", "1", "pi@aiia.gov.in", UserRole.PRINCIPAL_INVESTIGATOR.value, None, "Draft", "Created clinical study 'AYU-CT-2025-001: Ashwagandha Chronic Fatigue Trial'"),
            (audit_ts_base + timedelta(hours=2), "STATUS_CHANGE", "Study", "1", "admin@aiia.gov.in", UserRole.ADMINISTRATOR.value, "Draft", "Recruiting", "Study AYU-CT-2025-001 status changed to Recruiting following IEC approval and CTRI registration."),
            (audit_ts_base + timedelta(hours=4), "CREATE", "Study", "6", "pi@aiia.gov.in", UserRole.PRINCIPAL_INVESTIGATOR.value, None, "Draft", "Created clinical study 'AYU-CT-2025-006: Guduchi Immune Diabetes Trial'"),
            (audit_ts_base + timedelta(hours=6), "STATUS_CHANGE", "Study", "6", "admin@aiia.gov.in", UserRole.ADMINISTRATOR.value, "IEC Approved", "Recruiting", "Guduchi study activated for recruitment after CTRI registration confirmation."),
            (audit_ts_base + timedelta(hours=24), "CREATE", "SafetyEvent", "1", "pv@aiia.gov.in", UserRole.PHARMACOVIGILANCE_USER.value, None, "Under Review", "Recorded SAE 'Transaminase Elevation (ALT > 3x ULN)' for subject ASH-DEL-012 in Ashwagandha Trial."),
            (audit_ts_base + timedelta(hours=45), "CREATE", "SafetyEvent", "5", "pv@aiia.gov.in", UserRole.PHARMACOVIGILANCE_USER.value, None, "Under Review", "Recorded SAE 'Elevated Hepatic Enzymes' for subject GUD-DEL-028 in Guduchi Immune Diabetes Trial."),
            (audit_ts_base + timedelta(hours=46), "CREATE", "Alert", "1", "coordinator@aiia.gov.in", UserRole.STUDY_COORDINATOR.value, None, None, "System alert generated: SAE reporting deadline within 24h for Guduchi Immune Diabetes Trial subject GUD-DEL-028."),
        ]

        from app.audit.logger import _compute_hash, _normalize_timestamp

        prev_hash = None
        for ev in audit_events:
            payload = {
                "timestamp": _normalize_timestamp(ev[0]),
                "user_id": None,
                "user_email": ev[4],
                "user_role": ev[5],
                "action": ev[1],
                "entity_type": ev[2],
                "entity_id": ev[3],
                "previous_value": ev[6],
                "new_value": ev[7],
                "description": ev[8],
            }
            rec_hash = _compute_hash(payload, prev_hash)
            log = AuditLog(
                timestamp=ev[0],
                action=ev[1],
                entity_type=ev[2],
                entity_id=ev[3],
                user_email=ev[4],
                user_role=ev[5],
                previous_value=ev[6],
                new_value=ev[7],
                description=ev[8],
                previous_hash=prev_hash,
                record_hash=rec_hash
            )
            db.add(log)
            await db.commit()
            await db.refresh(log)
            prev_hash = rec_hash
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print(f"  Studies: {len(created_studies)}")
        print(f"  Sites: {len(created_sites)}")
        print(f"  Milestones: {len(milestones_data)}")
        print(f"  Safety Events: {len(safety_events_data)}")
        print(f"  Alerts: {len(alerts_data)}")
        print(f"  Audit Entries: {len(audit_events)}")

if __name__ == "__main__":
    asyncio.run(seed_data())
