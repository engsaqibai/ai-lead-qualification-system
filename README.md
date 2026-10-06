# AI Lead Qualification System

A production-oriented AI lead qualification backend built around lead scoring, human review, sales activity tracking, and sales follow-up management.

## Current pilot workflow

The current system supports this complete workflow:

1. Create a lead.
2. Automatically qualify the lead.
3. Review the qualification.
4. Record sales activity.
5. Assign a real next sales action and follow-up time.
6. View the action in the sales queue.
7. Record the follow-up activity.
8. Move the lead to its next sales action.

The workflow is covered by the end-to-end pilot acceptance test, and the current test suite has 46 passing tests.

## Prerequisites

- Python 3.12+
- PostgreSQL
- Git
- A Python virtual environment

## Local setup

From the repository root:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

If PowerShell blocks virtual-environment activation, enable scripts for the current Windows user:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Database configuration

The application reads configuration from `.env` through Pydantic Settings.

Required settings:

```text
DATABASE_USER=<postgres-user>
DATABASE_PASSWORD=<postgres-password>
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=<database-name>
```

`DATABASE_HOST` defaults to `localhost` and `DATABASE_PORT` defaults to `5432`.

Do not commit real credentials to Git.

## Database migrations

After configuring PostgreSQL and `.env`, apply the current Alembic migrations:

```powershell
alembic upgrade head
```

Check the current migration head:

```powershell
alembic current
```

## Run the API

Start the development server:

```powershell
uvicorn src.app.main:app --reload
```

The default local API address is:

```text
http://127.0.0.1:8000
```

## Health check

PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

A healthy local response should report:

```text
status      environment
------      -----------
healthy     development
```

## Interactive API

Open the FastAPI Swagger UI:

```text
http://127.0.0.1:8000/docs
```

Available pilot-facing operations include:

- `POST /leads` — create and qualify a lead
- `GET /leads` — list leads with filtering/pagination
- `GET /leads/{lead_id}` — view a lead
- `PATCH /leads/{lead_id}/review` — review a lead
- `POST /leads/{lead_id}/activities` — record sales activity
- `GET /leads/{lead_id}/activities` — view activity history
- `PATCH /leads/{lead_id}/next-action` — assign/update the real next sales action
- `GET /sales/actions` — view the sales action queue and upcoming actions

## Pilot operating flow

### 1. Create a lead

Use `POST /leads` with the lead's business and buying information.

The response contains the qualification result, including the qualification score, confidence, reasons, missing information, and recommended action.

### 2. Review the lead

Use:

```text
PATCH /leads/{lead_id}/review
```

This records the human review decision/state for the lead.

### 3. Record contact/activity

Use:

```text
POST /leads/{lead_id}/activities
```

Record meaningful sales events such as calls, demos, or other follow-up activity with an outcome and notes.

### 4. Assign the real next action

Use:

```text
PATCH /leads/{lead_id}/next-action
```

Set both the action and its planned time when a scheduled follow-up is appropriate.

Example concept:

```json
{
  "next_action": "Schedule product demo",
  "next_action_at": "2030-01-15T10:00:00Z"
}
```

The manually managed next action is intentionally separate from the system's recommended action: the recommendation informs the salesperson, while the next action represents the salesperson's actual operational commitment.

### 5. Work the sales queue

Use:

```text
GET /sales/actions
```

The endpoint supports upcoming-action filtering so the salesperson can focus on scheduled follow-ups.

### 6. Continue the lead lifecycle

After completing a follow-up, record the resulting activity and update the next action again. This creates a continuing sales workflow rather than a one-time qualification result.

## Verification

Run the complete automated test suite:

```powershell
python -m pytest -v
```

The current verified baseline is:

```text
46 passed
```

The dedicated pilot workflow can also be run independently:

```powershell
python -m pytest tests/test_api.py -k pilot_sales_workflow -v
```

## Common local issues

### PowerShell activation is blocked

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
.venv\Scripts\Activate.ps1
```

### Database connection fails

Verify that PostgreSQL is running and that `.env` contains the required database settings. Then run:

```powershell
alembic upgrade head
```

### API does not start

Verify the virtual environment and dependencies:

```powershell
python --version
pip install -r requirements.txt
```

Then start again:

```powershell
uvicorn src.app.main:app --reload
```

## Pilot readiness status

### Completed

- Lead qualification
- PostgreSQL persistence
- Alembic migrations
- Lead pagination and filtering
- Human review tracking
- Lead activity tracking
- Sales next-action management
- Sales action queue
- End-to-end sales workflow verification
- 46 automated tests passing
- Local API health verification
- Interactive Swagger pilot interface

### Current milestone

**Pilot Delivery / Usable Pilot**

The backend workflow is verified. The next product decision is to provide a simple operator-facing experience and deploy the smallest practical version for a real pilot user, without adding unnecessary backend complexity first.
