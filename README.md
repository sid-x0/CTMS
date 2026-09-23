# AIIA Clinical Trials Management System (CTMS)

A demonstration Clinical Trial Management System for the All India Institute of Ayurveda (AIIA). It includes portfolio oversight, study operations, participant consent controls, safety, compliance pre-flight checks, audit-chain review, and read-only regulator oversight.

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Docker Desktop (optional, for the Docker setup)

## Run locally (recommended for the demo)

Open two PowerShell terminals in the repository root.

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Use the bundled SQLite database for a standalone local demo.
$env:DATABASE_URL = "sqlite+aiosqlite:///./aiia_ctms.db"
$env:SYNC_DATABASE_URL = "sqlite:///./aiia_ctms.db"

# Recreates and seeds the local demo database.
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

The API is available at [http://localhost:8000](http://localhost:8000) and its interactive documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

> `python -m app.seed` drops and recreates the selected database. Do not use it against a database containing data you need to keep.

### 2. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then sign in with one of the demo accounts below. The frontend defaults to `http://localhost:8000/api/v1`; set `NEXT_PUBLIC_API_URL` only when using a different API address.

## Demo accounts

All demo accounts use the password `Password123!`.

| Role | Email |
|---|---|
| Administrator | `admin@aiia.gov.in` |
| Principal Investigator | `pi@aiia.gov.in` |
| Study Coordinator | `coordinator@aiia.gov.in` |
| Clinical Trial Monitor | `monitor@cro.org` |
| Ethics Committee Member | `ethics@aiia.gov.in` |
| Pharmacovigilance User | `pv@aiia.gov.in` |
| Regulator / Read-only User | `regulator@ayush.gov.in` |

## Run with Docker

With Docker Desktop running:

```powershell
docker-compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Stop the stack with `docker-compose down`; add `-v` only when you intentionally want to remove the PostgreSQL volume.

## Verify the project

In separate terminals, after installing dependencies:

```powershell
# Frontend production build
cd frontend
npm run build
```

```powershell
# Backend test suite
cd backend
.\.venv\Scripts\python.exe -m pytest app\tests\test_ctms_core.py -q
```

## Troubleshooting

- **Blank page or stale Next.js chunk error:** stop the frontend process, then run `npm run dev` again from `frontend`.
- **Port already in use:** stop the existing process using port `3000` (frontend) or `8000` (backend), then restart the command above.
- **API requests fail:** confirm the backend is running on port `8000`, and sign out/sign in again if the browser has an expired session.
