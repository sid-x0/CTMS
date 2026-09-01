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

    # 4. Attempt Invalid Transition: Screened -> Completed (Should Fail)
    inv_resp = await client.patch(f"/api/v1/participants/{p_id}/status", json={"status": "Completed"}, headers=pi_headers)
    assert inv_resp.status_code == 400

    # 5. Valid Transition Step 1: Screened -> Eligible
    v1 = await client.patch(f"/api/v1/participants/{p_id}/status", json={"status": "Eligible"}, headers=pi_headers)
    assert v1.status_code == 200
    assert v1.json()["status"] == "Eligible"

    # 6. Valid Transition Step 2: Eligible -> Enrolled
    v2 = await client.patch(f"/api/v1/participants/{p_id}/status", json={"status": "Enrolled"}, headers=pi_headers)
    assert v2.status_code == 200
    assert v2.json()["status"] == "Enrolled"

    # Verify Enrollment KPI updated
    study_detail = await client.get(f"/api/v1/studies/{study_id}", headers=pi_headers)
    assert study_detail.json()["current_enrollment"] == 1
    assert study_detail.json()["recruitment_percentage"] == 2.0

@pytest.mark.asyncio
async def test_audit_log_generation(client: AsyncClient, admin_headers):
    audit_resp = await client.get("/api/v1/audit-logs", headers=admin_headers)
    assert audit_resp.status_code == 200
    logs = audit_resp.json()
    assert isinstance(logs, list)
