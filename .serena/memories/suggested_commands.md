# Suggested Commands

## Backend (run from `backend/`)

```bash
# First-time setup
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Run dev server
PYTHONPATH=. .venv/bin/uvicorn app.main:app --reload

# Run tests
PYTHONPATH=. .venv/bin/python -m pytest tests/ -v

# Alembic — generate migration after model changes
PYTHONPATH=. .venv/bin/alembic revision --autogenerate -m "describe change"

# Alembic — apply migrations
PYTHONPATH=. .venv/bin/alembic upgrade head
```

## Frontend (run from `frontend/`)

```bash
npm install
npm run dev        # Vite dev server on :5173
npm run build      # Production build
npm run typecheck  # tsc --noEmit
npm run lint
```

## Docker (from project root)

```bash
docker compose up --build   # Start all services
docker compose down -v      # Stop + wipe volumes
```

## Env

Copy `backend/.env.example` → `backend/.env` and fill in secrets before running locally.
Generate Fernet key: `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
