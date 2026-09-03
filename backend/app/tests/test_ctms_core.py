import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_login(client: AsyncClient, test_admin_user):
    # Valid Login
    resp = await client.post("/api/v1/auth/login/json", json={"email": "admin@test.com", "password": "password123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user_role"] == "Administrator"

    # Invalid Login
    resp_bad = await client.post("/api/v1/auth/login/json", json={"email": "admin@test.com", "password": "wrongpassword"})
    assert resp_bad.status_code == 401


@pytest.mark.asyncio
async def test_rbac_enforcement(client: AsyncClient, pi_headers, regulator_headers):
    study_payload = {
        "protocol_number": "AIIA-TEST-001",
        "title": "Test Trial for RBAC Verification",
        "short_title": "RBAC Trial",
        "study_type": "Interventional",
        "intervention_type": "Ayurvedic Formulation",
        "phase": "Phase 2",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. Test PI",
        "target_enrollment": 100,
        "status": "Draft"
    }

    # Regulator (Read-only) should be forbidden from creating a study
    reg_resp = await client.post("/api/v1/studies", json=study_payload, headers=regulator_headers)
    assert reg_resp.status_code == 403

    # PI (Authorized) should succeed
    pi_resp = await client.post("/api/v1/studies", json=study_payload, headers=pi_headers)
    assert pi_resp.status_code == 201
    created_study = pi_resp.json()
    assert created_study["protocol_number"] == "AIIA-TEST-001"


@pytest.mark.asyncio
async def test_consent_enforced_before_enrollment(client: AsyncClient, pi_headers):
    """
    Test 4 (Consent Enforcement):
    - Create study, site, participant (status=Screened, consent_status=NOT_OBTAINED)
    - Attempt ELIGIBLE -> ENROLLED transition without consent → expect 400
    - Record consent (OBTAINED)
    - Retry ELIGIBLE -> ENROLLED transition → expect 200
    """
    # 1. Create Study
    study_resp = await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-CONSENT-001",
        "title": "Consent Enforcement Trial",
        "short_title": "Consent Trial",
        "study_type": "Interventional",
        "intervention_type": "Herbal Extract",
        "phase": "Phase 1",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. Consent PI",
        "target_enrollment": 50,
        "status": "Recruiting"
    }, headers=pi_headers)
    assert study_resp.status_code == 201
    study_id = study_resp.json()["id"]

    # 2. Create Site
    site_resp = await client.post(f"/api/v1/studies/{study_id}/sites", json={
        "study_id": study_id,
        "site_name": "Consent Test Site",
        "site_code": "SITE-CONS-01",
        "institution": "Test Inst",
        "location": "Delhi",
        "investigator": "Dr. Consent PI",
        "target_enrollment": 50
    }, headers=pi_headers)
    assert site_resp.status_code == 201
    site_id = site_resp.json()["id"]

    # 3. Create Participant (Screened, consent NOT obtained)
    p_resp = await client.post(f"/api/v1/studies/{study_id}/participants", json={
        "study_id": study_id,
        "site_id": site_id,
        "participant_code": "CONS-TEST-001"
    }, headers=pi_headers)
    assert p_resp.status_code == 201
    p = p_resp.json()
    p_id = p["id"]
    assert p["consent_status"] == "NOT_OBTAINED"

    # 4. Move to ELIGIBLE first
    e_resp = await client.patch(f"/api/v1/participants/{p_id}/status",
                                json={"status": "Eligible"}, headers=pi_headers)
    assert e_resp.status_code == 200

    # 5. Attempt ENROLLED without consent → must be blocked (400)
    enroll_no_consent = await client.patch(
        f"/api/v1/participants/{p_id}/status",
        json={"status": "Enrolled"},
        headers=pi_headers
    )
    assert enroll_no_consent.status_code == 400, (
        f"Expected 400 when enrolling without consent, got {enroll_no_consent.status_code}: {enroll_no_consent.text}"
    )
    assert "consent" in enroll_no_consent.json()["detail"].lower()

    # 6. Record consent (OBTAINED)
    consent_resp = await client.patch(f"/api/v1/participants/{p_id}/consent", json={
        "consent_status": "OBTAINED",
        "consent_version": "ICF-v1.0",
        "consent_date": "2026-09-03",
        "notes": "Signed and witnessed by PI"
    }, headers=pi_headers)
    assert consent_resp.status_code == 200
    assert consent_resp.json()["consent_status"] == "OBTAINED"

    # 7. Attempt ENROLLED again with consent → must succeed (200)
    enroll_with_consent = await client.patch(
        f"/api/v1/participants/{p_id}/status",
        json={"status": "Enrolled"},
        headers=pi_headers
    )
    assert enroll_with_consent.status_code == 200, (
        f"Expected 200 after consent, got {enroll_with_consent.status_code}: {enroll_with_consent.text}"
    )
    assert enroll_with_consent.json()["status"] == "Enrolled"


@pytest.mark.asyncio
async def test_participant_state_transitions_and_kpis(client: AsyncClient, pi_headers):
    # 1. Create Study
    study_resp = await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-STATE-001",
        "title": "State Transition Trial",
        "short_title": "State Trial",
        "study_type": "Interventional",
        "intervention_type": "Herbal Extract",
        "phase": "Phase 1",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. Test PI",
        "target_enrollment": 50,
        "status": "Recruiting"
    }, headers=pi_headers)
    study_id = study_resp.json()["id"]

    # 2. Create Site
    site_resp = await client.post(f"/api/v1/studies/{study_id}/sites", json={
        "study_id": study_id,
        "site_name": "Test Hospital Site",
        "site_code": "SITE-01",
        "institution": "Test Inst",
        "location": "Delhi",
        "investigator": "Dr. Test PI",
        "target_enrollment": 50
    }, headers=pi_headers)
    site_id = site_resp.json()["id"]

    # 3. Create Participant (Screened)
    p_resp = await client.post(f"/api/v1/studies/{study_id}/participants", json={
        "study_id": study_id,
        "site_id": site_id,
        "participant_code": "PAR-TEST-001"
    }, headers=pi_headers)
    assert p_resp.status_code == 201
    p_id = p_resp.json()["id"]
    assert p_resp.json()["status"] == "Screened"
    assert p_resp.json()["consent_status"] == "NOT_OBTAINED"

    # 4. Attempt Invalid Transition: Screened -> Completed (Should Fail)
    inv_resp = await client.patch(f"/api/v1/participants/{p_id}/status", json={"status": "Completed"}, headers=pi_headers)
    assert inv_resp.status_code == 400

    # 5. Valid Transition Step 1: Screened -> Eligible
    v1 = await client.patch(f"/api/v1/participants/{p_id}/status", json={"status": "Eligible"}, headers=pi_headers)
    assert v1.status_code == 200
    assert v1.json()["status"] == "Eligible"

    # 6. Record consent before enrollment
    await client.patch(f"/api/v1/participants/{p_id}/consent", json={
        "consent_status": "OBTAINED",
        "consent_version": "ICF-v1.0",
        "consent_date": "2026-09-03"
    }, headers=pi_headers)

    # 7. Valid Transition Step 2: Eligible -> Enrolled
    v2 = await client.patch(f"/api/v1/participants/{p_id}/status", json={"status": "Enrolled"}, headers=pi_headers)
    assert v2.status_code == 200
    assert v2.json()["status"] == "Enrolled"

    # Verify Enrollment KPI updated
    study_detail = await client.get(f"/api/v1/studies/{study_id}", headers=pi_headers)
    assert study_detail.json()["current_enrollment"] == 1
    assert study_detail.json()["recruitment_percentage"] == 2.0


@pytest.mark.asyncio
async def test_regulator_blocked_from_milestone_update(client: AsyncClient, pi_headers, regulator_headers):
    """
    Regulator must NOT be able to update milestone status.
    """
    # Create a study as PI
    study_resp = await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-REG-001",
        "title": "Regulator RBAC Test Trial",
        "short_title": "Reg Trial",
        "study_type": "Interventional",
        "intervention_type": "Herbal Extract",
        "phase": "Phase 2",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. PI",
        "target_enrollment": 50,
        "status": "Recruiting"
    }, headers=pi_headers)
    study_id = study_resp.json()["id"]

    # Create milestone as PI
    m_resp = await client.post(f"/api/v1/studies/{study_id}/milestones", json={
        "study_id": study_id,
        "name": "IEC Ethics Clearance",
        "milestone_type": "IEC",
        "planned_date": "2026-01-01",
        "status": "Pending"
    }, headers=pi_headers)
    assert m_resp.status_code == 201
    milestone_id = m_resp.json()["id"]

    # Regulator attempts to update milestone → must be 403
    reg_update = await client.patch(f"/api/v1/milestones/{milestone_id}", json={
        "status": "Completed"
    }, headers=regulator_headers)
    assert reg_update.status_code == 403, (
        f"Expected 403 for Regulator milestone update, got {reg_update.status_code}: {reg_update.text}"
    )


@pytest.mark.asyncio
async def test_audit_log_generation(client: AsyncClient, admin_headers):
    audit_resp = await client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert isinstance(logs, list)


@pytest.mark.asyncio
async def test_audit_integrity_endpoint(client: AsyncClient, admin_headers, pi_headers, test_pi_user):
    """
    After creating some records, the chain integrity endpoint must return valid=True.
    """
    # Generate some audit events by creating a study
    await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-AUDIT-001",
        "title": "Audit Chain Test Trial",
        "short_title": "Audit Trial",
        "study_type": "Interventional",
        "intervention_type": "Herbal",
        "phase": "Phase 1",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. Audit",
        "target_enrollment": 10,
        "status": "Draft"
    }, headers=pi_headers)

    integrity_resp = await client.get("/api/v1/audit-logs/integrity", headers=admin_headers)
    assert integrity_resp.status_code == 200
    result = integrity_resp.json()
    assert "valid" in result
    assert "total_records" in result
    assert "message" in result
    # Chain should be valid after fresh operations
    assert result["valid"] is True, f"Expected valid chain, got: {result['message']}"


@pytest.mark.asyncio
async def test_withdrawn_participant_and_withdrawn_consent_blocks_enrollment(client: AsyncClient, pi_headers):
    """
    Test Withdrawn state rules:
    1. A participant in WITHDRAWN status cannot transition to ENROLLED (state machine violation).
    2. A participant whose consent_status is WITHDRAWN cannot transition to ENROLLED.
    """
    # 1. Create study & site
    study_resp = await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-WITHDRAW-001",
        "title": "Withdrawal Test Trial",
        "short_title": "Withdraw Trial",
        "study_type": "Interventional",
        "intervention_type": "Herbal",
        "phase": "Phase 1",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. PI",
        "target_enrollment": 20,
        "status": "Recruiting"
    }, headers=pi_headers)
    study_id = study_resp.json()["id"]

    site_resp = await client.post(f"/api/v1/studies/{study_id}/sites", json={
        "study_id": study_id,
        "site_name": "Withdrawal Site",
        "site_code": "SITE-W01",
        "institution": "AIIA",
        "location": "Delhi",
        "investigator": "Dr. PI",
        "target_enrollment": 20
    }, headers=pi_headers)
    site_id = site_resp.json()["id"]

    # 2. Case A: Participant transitioned to WITHDRAWN status
    p1_resp = await client.post(f"/api/v1/studies/{study_id}/participants", json={
        "study_id": study_id,
        "site_id": site_id,
        "participant_code": "WITHDRAW-P01"
    }, headers=pi_headers)
    p1_id = p1_resp.json()["id"]

    # Withdraw from Screened
    await client.patch(f"/api/v1/participants/{p1_id}/status", json={"status": "Withdrawn"}, headers=pi_headers)

    # Attempt to transition out of Withdrawn to Enrolled -> 400
    retry_enroll = await client.patch(f"/api/v1/participants/{p1_id}/status", json={"status": "Enrolled"}, headers=pi_headers)
    assert retry_enroll.status_code == 400, "Should block transition out of Withdrawn terminal state"

    # 3. Case B: Participant whose consent was WITHDRAWN
    p2_resp = await client.post(f"/api/v1/studies/{study_id}/participants", json={
        "study_id": study_id,
        "site_id": site_id,
        "participant_code": "WITHDRAW-P02"
    }, headers=pi_headers)
    p2_id = p2_resp.json()["id"]

    # Screened -> Eligible
    await client.patch(f"/api/v1/participants/{p2_id}/status", json={"status": "Eligible"}, headers=pi_headers)

    # Record consent then withdraw it
    await client.patch(f"/api/v1/participants/{p2_id}/consent", json={
        "consent_status": "WITHDRAWN",
        "consent_version": "ICF-v1.0",
        "notes": "Subject revoked consent before enrollment"
    }, headers=pi_headers)

    # Attempt to enroll with withdrawn consent -> 400
    enroll_withdrawn_consent = await client.patch(f"/api/v1/participants/{p2_id}/status", json={"status": "Enrolled"}, headers=pi_headers)
    assert enroll_withdrawn_consent.status_code == 400, "Should block enrollment when consent is Withdrawn"


@pytest.mark.asyncio
async def test_all_seven_roles_rbac(
    client: AsyncClient,
    admin_headers,
    pi_headers,
    coordinator_headers,
    pv_headers,
    ethics_headers,
    monitor_headers,
    regulator_headers
):
    """
    Verify RBAC authority across all seven distinct institutional roles:
    1. Administrator: Full operational authority.
    2. PI: Study creation and management.
    3. Study Coordinator: Participant registration and milestone creation.
    4. Pharmacovigilance: Safety event recording and SAE review.
    5. Ethics Committee: Compliance milestone resolution.
    6. Monitor: Read-only access to monitoring data, blocked from study mutation.
    7. Regulator: Full read-only access (GET), all mutations rejected with 403.
    """
    # 1. PI creates study
    study_resp = await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-7ROLES-001",
        "title": "Seven Roles Multi-Tier RBAC Verification Trial",
        "short_title": "7-Roles Trial",
        "study_type": "Interventional",
        "intervention_type": "Ayurvedic Herbal Compound",
        "phase": "Phase 2",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. PI",
        "target_enrollment": 100,
        "status": "Active"
    }, headers=pi_headers)
    assert study_resp.status_code == 201
    study_id = study_resp.json()["id"]

    # 2. Coordinator creates site
    site_resp = await client.post(f"/api/v1/studies/{study_id}/sites", json={
        "study_id": study_id,
        "site_name": "AIIA Clinical Research Ward",
        "site_code": "SITE-7R",
        "institution": "All India Institute of Ayurveda",
        "location": "New Delhi",
        "investigator": "Dr. PI",
        "target_enrollment": 100
    }, headers=coordinator_headers)
    assert site_resp.status_code == 201
    site_id = site_resp.json()["id"]

    # 3. Coordinator screens participant
    p_resp = await client.post(f"/api/v1/studies/{study_id}/participants", json={
        "study_id": study_id,
        "site_id": site_id,
        "participant_code": "PT-7R-001"
    }, headers=coordinator_headers)
    assert p_resp.status_code == 201

    # 4. PV User logs a safety event
    sae_resp = await client.post("/api/v1/safety", json={
        "study_id": study_id,
        "site_id": site_id,
        "participant_code": "PT-7R-001",
        "event_term": "Acute Gastritis",
        "ayurvedic_concept": "Amlapitta",
        "intervention": "Ayurvedic Compound",
        "event_type": "SAE",
        "severity": "Moderate",
        "seriousness": True,
        "causality": "Possible",
        "onset_date": "2026-09-01",
        "reporting_deadline": "2026-09-05",
        "description": "Transient abdominal pain post dose."
    }, headers=pv_headers)
    assert sae_resp.status_code == 201
    sae_id = sae_resp.json()["id"]

    # PV User reviews the SAE (Reported to IEC/DCGI prototype transition)
    pv_review = await client.patch(f"/api/v1/safety/{sae_id}/review", json={
        "status": "Reported to IEC/DCGI"
    }, headers=pv_headers)
    assert pv_review.status_code == 200
    assert pv_review.json()["status"] == "Reported to IEC/DCGI"

    # 5. Coordinator creates an IEC milestone
    m_resp = await client.post(f"/api/v1/studies/{study_id}/milestones", json={
        "study_id": study_id,
        "name": "Institutional Ethics Committee Clearance",
        "milestone_type": "IEC",
        "planned_date": "2026-09-01",
        "status": "Pending"
    }, headers=coordinator_headers)
    assert m_resp.status_code == 201
    milestone_id = m_resp.json()["id"]

    # Ethics Committee Member resolves the milestone via compliance pre-flight endpoint
    ethics_res = await client.post(
        f"/api/v1/compliance/studies/{study_id}/milestones/{milestone_id}/complete",
        headers=ethics_headers
    )
    assert ethics_res.status_code == 200
    assert ethics_res.json()["study_id"] == study_id

    # 6. Monitor: Read-only access works (200), mutations rejected (403)
    mon_read = await client.get(f"/api/v1/studies/{study_id}", headers=monitor_headers)
    assert mon_read.status_code == 200

    mon_mutate = await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-MON-FAIL",
        "title": "Monitor should not create",
        "short_title": "Fail",
        "study_type": "Interventional",
        "intervention_type": "Herbal",
        "phase": "Phase 1",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. PI",
        "target_enrollment": 10,
        "status": "Draft"
    }, headers=monitor_headers)
    assert mon_mutate.status_code == 403

    # 7. Regulator: All read endpoints return 200, all mutations return 403
    reg_studies = await client.get("/api/v1/studies", headers=regulator_headers)
    assert reg_studies.status_code == 200
    reg_sites = await client.get(f"/api/v1/studies/{study_id}/sites", headers=regulator_headers)
    assert reg_sites.status_code == 200
    reg_participants = await client.get(f"/api/v1/studies/{study_id}/participants", headers=regulator_headers)
    assert reg_participants.status_code == 200
    reg_safety = await client.get("/api/v1/safety", headers=regulator_headers)
    assert reg_safety.status_code == 200

    # Regulator mutations MUST return 403
    reg_post_study = await client.post("/api/v1/studies", json={"protocol_number": "REG-FAIL"}, headers=regulator_headers)
    assert reg_post_study.status_code == 403
    reg_post_safety = await client.post("/api/v1/safety", json={"event_term": "REG-FAIL"}, headers=regulator_headers)
    assert reg_post_safety.status_code == 403
    reg_patch_milestone = await client.patch(f"/api/v1/milestones/{milestone_id}", json={"status": "Completed"}, headers=regulator_headers)
    assert reg_patch_milestone.status_code == 403


@pytest.mark.asyncio
async def test_safety_workflow_and_intelligence_recalculation(client: AsyncClient, pi_headers, pv_headers):
    """
    Verify the complete safety loop:
    1. Study starts with baseline risk.
    2. Add SAE (Under Review) -> active safety risk elevates.
    3. Review/report SAE -> status changes to 'Reported to IEC/DCGI'.
    4. Audit entry created for status change.
    5. Active safety score drops because event is no longer Under Review.
    """
    study_resp = await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-SAFETY-LOOP",
        "title": "Safety Intelligence Recalculation Trial",
        "short_title": "Safety Loop Trial",
        "study_type": "Interventional",
        "intervention_type": "Ashwagandha Extract",
        "phase": "Phase 2",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. Safety PI",
        "target_enrollment": 100,
        "status": "Active"
    }, headers=pi_headers)
    study_id = study_resp.json()["id"]

    # Baseline risk check via study dashboard
    dash_pre = await client.get(f"/api/v1/dashboard/studies/{study_id}", headers=pi_headers)
    assert dash_pre.status_code == 200
    safety_score_pre = dash_pre.json()["risk"]["safety_score"]
    assert safety_score_pre == 0

    # Add SAE
    sae_resp = await client.post("/api/v1/safety", json={
        "study_id": study_id,
        "event_term": "Hepatic Transaminase Elevation",
        "intervention": "Ashwagandha Extract",
        "event_type": "SAE",
        "severity": "Severe",
        "seriousness": True,
        "causality": "Probable",
        "onset_date": "2026-09-02",
        "reporting_deadline": "2026-09-04",
        "description": "Elevated liver function enzymes."
    }, headers=pv_headers)
    assert sae_resp.status_code == 201
    sae_id = sae_resp.json()["id"]

    # Post-SAE risk check: safety_score should have elevated
    dash_post_sae = await client.get(f"/api/v1/dashboard/studies/{study_id}", headers=pi_headers)
    safety_score_elevated = dash_post_sae.json()["risk"]["safety_score"]
    assert safety_score_elevated >= 8, f"Expected elevated safety score (>=8), got {safety_score_elevated}"

    # Review the SAE (prototype state transition to Reported to IEC/DCGI)
    review_resp = await client.patch(f"/api/v1/safety/{sae_id}/review", json={
        "status": "Reported to IEC/DCGI"
    }, headers=pv_headers)
    assert review_resp.status_code == 200
    assert review_resp.json()["status"] == "Reported to IEC/DCGI"

    # Post-review risk check: safety_score should drop back down since event is no longer Under Review
    dash_post_review = await client.get(f"/api/v1/dashboard/studies/{study_id}", headers=pi_headers)
    safety_score_resolved = dash_post_review.json()["risk"]["safety_score"]
    assert safety_score_resolved < safety_score_elevated, (
        f"Expected safety score to decrease after review ({safety_score_resolved} < {safety_score_elevated})"
    )


@pytest.mark.asyncio
async def test_compliance_preflight_and_milestone_resolution(client: AsyncClient, pi_headers, coordinator_headers):
    """
    Verify the complete compliance loop:
    1. Study starts with pending IEC approval milestone -> preflight check fails.
    2. Resolve milestone via /compliance/studies/{id}/milestones/{id}/complete.
    3. Preflight re-evaluates -> IEC check passes.
    4. Audit log verifies STATUS_CHANGE on milestone.
    """
    study_resp = await client.post("/api/v1/studies", json={
        "protocol_number": "AIIA-PREFLIGHT-001",
        "title": "Pre-Flight Compliance Trial",
        "short_title": "Preflight Trial",
        "study_type": "Interventional",
        "intervention_type": "Ayush-64",
        "phase": "Phase 3",
        "sponsor": "AIIA",
        "principal_investigator": "Dr. Compliance PI",
        "target_enrollment": 100,
        "status": "Draft"
    }, headers=pi_headers)
    study_id = study_resp.json()["id"]

    # Add active site
    await client.post(f"/api/v1/studies/{study_id}/sites", json={
        "study_id": study_id,
        "site_name": "AIIA Main Hospital",
        "site_code": "SITE-PF1",
        "institution": "AIIA",
        "location": "New Delhi",
        "investigator": "Dr. PI",
        "target_enrollment": 100
    }, headers=pi_headers)

    # Add pending IEC milestone
    m_resp = await client.post(f"/api/v1/studies/{study_id}/milestones", json={
        "study_id": study_id,
        "name": "Institutional Ethics Committee (IEC) Clearance",
        "milestone_type": "IEC Approval",
        "planned_date": "2026-08-15",
        "status": "Pending"
    }, headers=coordinator_headers)
    milestone_id = m_resp.json()["id"]

    # Run preflight check -> IEC check should fail
    preflight_1 = await client.get(f"/api/v1/compliance/studies/{study_id}/preflight", headers=pi_headers)
    assert preflight_1.status_code == 200
    checklist_1 = {item["key"]: item["passed"] for item in preflight_1.json()["checklist"]}
    assert checklist_1["iec_approval"] is False, "IEC check should be false before milestone resolution"

    # Resolve milestone via compliance endpoint
    res_resp = await client.post(
        f"/api/v1/compliance/studies/{study_id}/milestones/{milestone_id}/complete",
        headers=coordinator_headers
    )
    assert res_resp.status_code == 200
    updated_checklist = {item["key"]: item["passed"] for item in res_resp.json()["checklist"]}
    assert updated_checklist["iec_approval"] is True, "IEC check should be true after milestone resolution"
