# `scripts/test_agents.py`

This script runs a small test suite for AMBER’s agent flows.

It supports two modes:

- **Unit tests (default)**: fast, no server required, no network calls.
- **Integration tests (opt-in)**: hits the running FastAPI server and exercises the real `/agents/*` endpoints.

## Prerequisites

- Python 3.11+ recommended
- API dependencies installed (from `apps/api/requirements.txt`)
- If running integration tests:
  - FastAPI server running (see below)
  - `.env` configured (Supabase creds, etc.)

## Run: unit tests (fast, no server)

From repo root:

```bash
PYTHONPATH=apps/api python3 scripts/test_agents.py
```

## Run: integration tests (end-to-end)

1) Start the API server in a separate terminal:

```bash
npm run api:run
```

2) Run the test script with integration enabled:

```bash
AMBER_RUN_API_INTEGRATION=1 PYTHONPATH=apps/api python3 scripts/test_agents.py
```

To get more descriptive output (incident IDs, file URLs, report PDF URL), enable verbose mode:

```bash
AMBER_RUN_API_INTEGRATION=1 AMBER_TEST_VERBOSE=1 PYTHONPATH=apps/api python3 scripts/test_agents.py
```

Integration tests will:

- Call `GET /health`
- Ingest a note (`POST /agents/ingest/note`)
- Upload a generated PNG (`POST /agents/ingest/upload`)
- Generate a report (`POST /agents/report`) and verify the returned `pdf_url` serves a real PDF

## Environment variables

- `AMBER_RUN_API_INTEGRATION`
  - Set to `1` to enable integration tests.
- `AMBER_BASE_URL`
  - Defaults to `http://localhost:8000`.
- `AMBER_TEST_USER_ID`
  - Optional.
  - If not provided, integration tests generate a fresh UUID user per run.

- `AMBER_TEST_VERBOSE`
  - Optional.
  - Set to `1` to print useful debug output during integration tests:
    - which `user_id` was used
    - created `incident_id`s
    - uploaded `file_url`s
    - generated `report_id` and `pdf_url`

## Scenario test: “strong case”

The integration suite includes a scenario test that seeds **10 incidents** (notes + photo uploads)
for a single fresh user and then generates a report. This is useful when you want a richer PDF
to manually inspect for formatting issues.

## Troubleshooting

- **Cannot connect to server**
  - Make sure `npm run api:run` is running and `AMBER_BASE_URL` is correct.

- **Supabase errors**
  - Integration tests create rows in your Supabase tables via the API.
  - Ensure `.env` has correct `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

- **Warnings about `requests` / `urllib3` versions**
  - These are usually from your local Python environment and don’t necessarily break tests.
  - Prefer running in a clean virtualenv for the API dependencies.
