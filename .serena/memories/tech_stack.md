# Tech Stack

## Backend (Python 3.14, backend/)

- FastAPI 0.111 + uvicorn
- SQLAlchemy 2.x async (asyncpg driver) — `app/core/database.py`
- Alembic migrations — `alembic/env.py` uses async engine
- Pydantic v2 + pydantic-settings for config/schemas
- passlib[bcrypt] password hashing; python-jose[cryptography] JWT
- cryptography (Fernet) for OAuth token encryption at rest
- APScheduler for hourly ingestion
- httpx for platform API calls (connectors)
- pytest + pytest-asyncio for tests; venv at `backend/.venv`

## Frontend (frontend/)

- React 18 + TypeScript + Vite 5
- React Router v6 (file-based routing in `src/pages/`)
- TanStack Query v5 for server state
- axios with interceptors (`src/services/api.ts`) — base URL `/api`, auto-attaches JWT
- Recharts for charts
- Tailwind CSS 3 + PostCSS

## Infrastructure

- Postgres 16 (docker-compose service `db`, volume `pgdata`)
- docker-compose.yml at project root
