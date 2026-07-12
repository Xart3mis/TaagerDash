# TaagerDash

A private dashboard for the Taager media buying team to track ad performance across Meta, TikTok, and Snapchat, log order funnel data, and see where each buyer stands. Built to be fast: open the dashboard, read your numbers, spot what's off, and act. All within 60 seconds.

## Quick Start (Docker)

Prerequisites: Docker and Docker Compose.

```bash
git clone https://github.com/taager/TaagerDash.git
cd TaagerDash
docker-compose up
```

Wait for the backend and frontend to finish building (you'll see `Uvicorn running on http://0.0.0.0:8000`). Then visit `http://localhost:5173` in your browser.

What just happened: Docker started PostgreSQL, a FastAPI backend on port 8000, and a React frontend on port 5173. Everything is wired together.

**Next step?** Pick your path:
- **Want to understand what you're looking at?** Jump to [Product Overview](#product-overview)
- **Want to run the code locally for development?** Jump to [Local Development](#local-development)
- **Want to understand how sign-up and teams work?** Jump to [Authentication](#authentication)

## Product Overview

### What is TaagerDash?

TaagerDash is a centralized dashboard for media buyers. It pulls ad metrics from Meta, TikTok, and Snapchat into one place, tracks order funnel data (from lead to purchase), and shows performance by buyer. The design is built around one principle: the buyer should be able to scan the dashboard and spot performance issues in seconds, not minutes.

### Key Features

- **Cross-platform metrics**: Real-time ad performance (CTR, spend, impressions, ROAS) from all three platforms
- **Order funnel tracking**: See where customers go from lead capture to purchase
- **Team leaderboard**: Performance benchmarks and rankings by buyer
- **Team management**: Admins invite new members. Members access only their team's data
- **Multi-tenant support**: Each team has its own dashboard and isolated data

### Design Philosophy

The dashboard is built to be friendly, clear, and precise. Numbers should jump off the screen. Hierarchy and spacing exist to surface key metrics first, not to look pretty. The UI should feel like a tool built for a team that cares about clarity, not a cold analytics platform.

## Authentication

### How Sign-Up and Teams Work

TaagerDash uses an invite-only model. Users don't sign up publicly. Instead, an admin generates an invite token, shares it with the new member, and they use that token to create their account.

Here's the flow:

```
Admin generates invite token
            ↓
Admin shares token with new member
            ↓
New member visits sign-up page, enters token
            ↓
Account is created, member added to team
            ↓
Member can access team dashboard
```

### Key Concepts

- **Invite-only model**: No public sign-ups. Access is controlled.
- **Team-scoped data**: Members see only their team's metrics and other team members. Data is completely isolated between teams.
- **Admin role**: Can generate invite tokens and manage team access.
- **Member role**: Can view dashboards and data for their team.
- **Tokens**: Single-use, time-limited. Once used, the token expires.

### Getting Started as a New Member

1. Receive an invite token from your admin (via email or Slack)
2. Visit `http://localhost:5173/signup` (or your production URL)
3. Paste the invite token into the token field
4. Create your account with a password
5. You're in. Click "Dashboard" to see your team's metrics

### Getting Started as an Admin

1. Log in with your admin account
2. Go to Team Settings
3. Generate a new invite token
4. Share it with the new team member (via email, Slack, or however your team prefers)
5. They use it to sign up

## Local Development

Run locally when you're building features or fixing bugs. Local development gives you faster iteration and better debugging than Docker.

### Prerequisites

- **Python**: 3.12 or higher
- **Node**: 18 or higher
- **PostgreSQL**: 16 (or run just the database in Docker; see "Hybrid Setup" below)
- **Git**

### Backend Setup

```bash
# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure it
cp backend/.env.example backend/.env
# Edit backend/.env and set DATABASE_URL if needed

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload
```

The backend runs on `http://localhost:8000`. The API is at `http://localhost:8000/api`. The `--reload` flag restarts the server when you change code.

### Frontend Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

The frontend runs on `http://localhost:5173`. It auto-proxies API calls to the backend, so you don't need to configure anything.

### Running Tests

Backend tests:
```bash
pytest tests/
```

Frontend tests (if configured):
```bash
npm run test
```

### Hybrid Setup (Recommended)

Want PostgreSQL isolated in Docker but everything else running locally?

```bash
# Terminal 1: Start only the database
docker-compose up db

# Terminal 2: Backend (in your venv)
source venv/bin/activate
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/adtracker"
uvicorn app.main:app --reload

# Terminal 3: Frontend
npm run dev
```

This gives you the isolation of Docker for the database without waiting for full container builds.

## Architecture Overview

### System Diagram

```
Frontend (React, TypeScript, Vite)
    │
    │ HTTP requests
    ↓
Backend (FastAPI, Python 3.12)
    │
    │ SQL queries
    ↓
Database (PostgreSQL 16)
```

### Directory Structure

**Backend** (`backend/app/`)
- `routers/` — API endpoints (auth, teams, dashboards, etc.)
- `models/` — SQLAlchemy ORM models
- `schemas/` — Pydantic request/response schemas
- `core/` — Configuration, security, authentication
- `utils/` — Shared utilities

**Frontend** (`frontend/src/`)
- `pages/` — Top-level page components (Dashboard, SignUp, Profile, Teams, etc.)
- `components/` — Reusable UI components
- `services/` — API client and data fetching
- `hooks/` — Custom React hooks
- `types/` — TypeScript type definitions

**Database** (`backend/alembic/`)
- Versioned database migrations. Run `alembic upgrade head` to apply all pending migrations.

**Documentation** (`docs/`)
- Design specs and product documentation in `docs/superpowers/specs/`
- `PRODUCT.md` has brand and design philosophy

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy 2.0, Alembic, Passlib |
| Database | PostgreSQL 16, asyncpg |
| Deployment | Docker Compose |
| Package managers | npm (frontend), pip/uv (backend) |

### Data Flow Example

How the dashboard loads:

1. User logs in, frontend receives a JWT token
2. Frontend stores the token and includes it in all API requests
3. User navigates to Dashboard
4. Frontend calls `GET /api/dashboard/metrics`
5. Backend validates the token, queries the database for team-scoped metrics
6. Database returns results, backend aggregates them
7. Backend sends JSON response to frontend
8. Frontend renders charts and tables

## Contributing

### Making Backend Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make changes in `backend/app/`
3. If you need to change the database schema:
   - Create a migration: `alembic revision -m "Add column description"`
   - Edit the migration file in `backend/alembic/versions/`
   - Test it: `alembic upgrade head`
4. Run tests: `pytest tests/`
5. Commit and push, then open a PR

### Making Frontend Changes

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make changes in `frontend/src/`
3. Test locally: `npm run dev`
4. Commit and push, then open a PR

### Finding Patterns

- **New API endpoint?** Look at `backend/app/routers/` to see how existing endpoints are structured. Check how they handle auth, error responses, and validation.
- **New React page?** Check `frontend/src/pages/` for patterns: how they fetch data, use hooks, and apply styling.
- **New database table?** Look at existing models in `backend/app/models/` and migrations in `backend/alembic/versions/`.

### Common Tasks

- **Bug fix**: Start with local setup, create a branch, fix it, run tests, commit
- **New feature**: Check the design spec first (in `docs/superpowers/specs/`), implement it, test it, commit
- **Schema change**: Always create an Alembic migration as a separate commit from the code that uses it
- **Deploy to production**: Check the deployment guide (link in progress)

### Questions?

- Browse design specs in `docs/superpowers/specs/`
- Check existing PRs and issues for similar work
- Ask your team on Slack or in your team channel

---

Built with care by the Taager media buying team.
