# SIH26046 — AIIA Clinical Trials Dashboard (Phase 1 Core CTMS)

A real-time, cloud-ready **Clinical Trial Management System (CTMS)** engineered for the **All India Institute of Ayurveda (AIIA)** under Ministry of Ayush standards.

---

## 🌟 Features Implemented in Phase 1

1. **JWT Authentication & Backend RBAC Enforcement**
   - 7 distinct roles: *Administrator, Principal Investigator, Study Coordinator, Clinical Trial Monitor, Ethics Committee Member, Pharmacovigilance User, Regulator / Read-only User*.
   - Strict backend dependency enforcement (`require_roles`).

2. **Core Clinical Study Management**
   - Register, search, filter and track clinical trials across phases (Phase 1–4) and study types.
   - Comprehensive study lifecycle status transitions (*Draft, Pending IEC Approval, IEC Approved, CTRI Registered, Recruiting, Active, Suspended, Completed, Closed*).

3. **Multi-Center Site Governance**
   - Add multi-center trial sites (AIIA Main Campus Delhi, BHU Varanasi, ITRA Jamnagar, NIA Jaipur).
   - Track site-level target vs. actual recruitment progress and activation dates.

4. **Pseudonymous Participant & Recruitment Tracking**
   - Strict pseudonymous code allocation (e.g. `ASH-DEL-001`) preventing PII leaks.
   - Validated State Machine transitions (*Screened → Eligible → Enrolled → Randomized → Completed / Withdrawn / Screen Failure*).
   - Automatic live calculation of enrollment metrics for sites and studies.

5. **Study Milestone Tracking & Overdue Ticker**
   - Planned vs. actual date tracking for key trial milestones (*Protocol Finalized, IEC Submission, IEC Approval, CTRI Registration, Site Activation, First Subject Enrolled, Study Close-out*).
   - Color-coded overdue alerts for delayed milestones.

6. **Executive Portfolio KPI Dashboard**
   - Live KPI cards, velocity charts (Screened vs Enrolled vs Completed), status breakdown, milestone ticker, and active notification feed.

7. **Append-Only Audit Trail System**
   - Immutable audit logging of all CRUD actions, status transitions, and user logins.
   - Interactive JSON diff inspector comparing `previous_value` vs `new_value`.

8. **Internal Alert Notification Engine**
   - Internal flags for site enrollment lag, overdue milestones, and upcoming target dates.

---

## 🛠️ Recommended Tech Stack

- **Backend**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy (Async), Alembic, PyJWT / Passlib (Bcrypt).
- **Database**: PostgreSQL (Production) / SQLite (Development Fallback).
- **Cache**: Redis.
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts, Framer Motion.
- **Orchestration**: Docker & docker-compose.

---

## 🚀 Quick Start Instructions

### Option 1: Run with Docker Compose

```bash
docker-compose up --build
```
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **OpenAPI Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Local Development Setup

#### Backend Setup:
```bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

#### Run Backend Tests:
```bash
cd backend
python -m pytest
```

#### Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Demo Login Credentials (Quick Role Switcher Available)

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@aiia.gov.in` | `Password123!` |
| Principal Investigator | `pi@aiia.gov.in` | `Password123!` |
| Study Coordinator | `coordinator@aiia.gov.in` | `Password123!` |
| Clinical Trial Monitor | `monitor@cro.org` | `Password123!` |
| Ethics Committee Member | `ethics@aiia.gov.in` | `Password123!` |
| Pharmacovigilance User | `pv@aiia.gov.in` | `Password123!` |
| Regulator / Read-only User | `regulator@ayush.gov.in` | `Password123!` |

---

## 🧪 Verification & Test Results

All core backend functionalities have been verified with automated unit and integration tests:
- `test_auth_login`: Validates JWT token issue & credentials verification.
- `test_rbac_enforcement`: Confirms backend authorization restrictions (e.g. Regulator blocked from study mutations, PI authorized).
- `test_participant_state_transitions_and_kpis`: Validates state machine rules (Screened → Eligible → Enrolled) and auto-updating recruitment KPIs.
- `test_audit_log_generation`: Verifies append-only audit event emission.
