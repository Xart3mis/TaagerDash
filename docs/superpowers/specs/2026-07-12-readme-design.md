# README.md Design Specification

**Date**: July 12, 2026  
**Project**: TaagerDash  
**Status**: Design Phase

## Overview

TaagerDash is a private, invite-only ad performance dashboard for the Taager media buying team. This README serves **three audiences simultaneously**: internal developers, new team members, and external contributors/partners. The design uses a "fast path + deep dive" structure so readers can jump to what matters to them without wading through irrelevant sections.

## Audience & Goals

### Primary Audiences
1. **Internal developers** — Need to understand the codebase, run it locally, and contribute
2. **New team members** — Need to understand what the product is, how to use it, and how auth works
3. **External contributors/partners** — Need to understand architecture, deployment, and integration points

### Success Criteria
- A new developer can run the entire stack locally in <5 minutes
- A new team member understands the product purpose and auth flow after reading Sections 1–4
- Someone interested in integrations can find architecture docs without scrolling past setup instructions

## Design Approach: "Fast Path + Deep Dive"

The README uses **clear signposts** to guide readers to relevant sections. After the Quick Start, readers choose their own path:
- "Want to understand what you just ran?" → Product Overview
- "Want to hack on it?" → Local Development
- "Want to understand how it's built?" → Architecture Overview

This prevents developers from getting stuck behind product explanations, and prevents product people from getting stuck behind setup commands.

---

## Section Specifications

### Section 1: Header & Quick Intro
**Content Length**: 2–4 sentences  
**Purpose**: Immediate clarity on what TaagerDash is

**Outline**:
- One-liner: "TaagerDash — Ad Performance Dashboard for Media Buying Teams"
- 2–4 sentence description covering:
  - What it does (centralizes ad metrics across Meta, TikTok, Snapchat)
  - Who uses it (Taager media buying team)
  - Core benefit (60-second workflow for performance review)

**Tone**: Friendly, direct, no marketing fluff

---

### Section 2: Quick Start with Docker
**Purpose**: Get users running in <5 minutes  
**Target Audience**: Developers who want to see it working

**Outline**:
1. **Prerequisites**: Docker & Docker Compose
2. **Three commands**:
   ```bash
   git clone <repo>
   cd TaagerDash
   docker-compose up
   ```
3. **One-line explanation**: "This starts PostgreSQL, the FastAPI backend (port 8000), and React frontend (port 5173), all pre-wired."
4. **Success check**: "Visit `http://localhost:5173` — you should see the login page"
5. **Signposts** (mutually exclusive):
   - "Want to understand what you're looking at? Jump to [Product Overview](#product-overview)"
   - "Want to run locally for development? Jump to [Local Development](#local-development)"
   - "Want to understand the auth flow? Jump to [Authentication](#authentication)"

---

### Section 3: Product Overview
**Purpose**: Explain what TaagerDash is and why it exists  
**Target Audience**: New team members, external stakeholders

**Outline**:

#### What is TaagerDash?
- Centralized dashboard for Taager media buying team
- Aggregates ad metrics from Meta, TikTok, Snapchat
- Tracks order funnel data from customer acquisition to purchase
- Enables media buyers to spot performance issues and act within 60 seconds

#### Key Features (Essentials Only)
- **Cross-platform metrics**: Real-time ad performance (CTR, spend, impressions) from all three platforms
- **Order funnel tracking**: From lead capture through purchase (integrating with EasyOrders for order data)
- **Team leaderboard**: Per-buyer performance benchmarks and rankings
- **Team management**: Invite-based access control, separate data per team
- **Multi-tenant support**: Each team has isolated dashboards and data

#### Design Philosophy
- **Read the number first**: Hierarchy and spacing exist to surface key metrics fast
- **Warm precision**: Approachable tone paired with careful accuracy
- **Shared workspace energy**: Leaderboard and team features feel collaborative, not competitive
- **Calm confidence**: Clear performance feedback without anxiety-inducing alerts

---

### Section 4: Understanding the Authentication Flow
**Purpose**: Explain how team access and sign-up works  
**Target Audience**: Developers, new team members, admins

**Outline**:

#### High-Level Flow
```
Admin issues invite token
           ↓
New user receives token
           ↓
User visits sign-up, enters token
           ↓
Account created, added to team
           ↓
Access to team dashboard
```

#### Key Concepts
- **Invite-only model**: No public sign-up; users join only via admin-issued token
- **Team-scoped data**: Each team sees only its own metrics and members
- **Roles**: Admin (can issue invites, manage team), Member (can view dashboards)
- **Token lifecycle**: Tokens are single-use and time-limited

#### Getting Started (New User)
1. Receive invite token from your admin
2. Visit `http://localhost:5173/signup` (or production URL)
3. Paste the token into the invite field
4. Create your account
5. Access your team's dashboard

#### Getting Started (Admin)
1. Log in with your admin account
2. Navigate to Team Settings
3. Generate and share invite tokens with new members

---

### Section 5: Local Development
**Purpose**: Enable developers to run the project locally for feature work  
**Target Audience**: Internal developers, contributors

**Outline**:

#### When to Use This Section
"If you're building features or fixing bugs, running locally gives you faster iteration and better debugging."

#### Prerequisites
- **Python**: 3.12 or higher
- **Node**: 18 or higher
- **PostgreSQL**: 16 (or use Docker for the DB only — see "Hybrid Setup")
- **Git**: Standard version control

#### Backend Setup
1. Create Python venv: `python -m venv venv && source venv/bin/activate`
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and configure (database URL, etc.)
4. Run migrations: `alembic upgrade head`
5. Start server: `uvicorn app.main:app --reload`
6. Backend runs on `http://localhost:8000`, API on `http://localhost:8000/api`

#### Frontend Setup
1. `npm install`
2. `npm run dev`
3. Frontend runs on `http://localhost:5173`, auto-proxies API to backend

#### Running Tests
- **Backend**: `pytest tests/`
- **Frontend**: `npm run test` (if configured)

#### Hybrid Setup (Recommended)
Want PostgreSQL isolation without full Docker?
```bash
# Terminal 1: Start only the database
docker-compose up db

# Terminal 2: Backend (in venv)
source venv/bin/activate
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/adtracker"
uvicorn app.main:app --reload

# Terminal 3: Frontend
npm run dev
```

---

### Section 6: Architecture Overview
**Purpose**: Explain how the system is built  
**Target Audience**: Developers, architects, integrators

**Outline**:

#### System Diagram
```
Frontend (React/Vite/TypeScript)
  │ HTTP requests
  ↓
Backend (FastAPI, Python 3.12)
  │ SQL queries
  ↓
Database (PostgreSQL 16)
```

#### Key Directories

**Backend** (`backend/app/`)
- `routers/` — API endpoints (auth, teams, dashboards, etc.)
- `models/` — SQLAlchemy ORM models
- `schemas/` — Pydantic request/response schemas
- `core/` — Configuration, security, dependencies
- `utils/` — Shared utilities (date parsing, calculations, etc.)

**Frontend** (`frontend/src/`)
- `pages/` — React page components (Dashboard, SignUp, Profile, etc.)
- `components/` — Reusable UI components
- `services/` — API client and data fetching
- `hooks/` — Custom React hooks
- `types/` — TypeScript type definitions

**Database** (`backend/alembic/`)
- Versioned migrations for schema changes
- Each migration is an atomic step (run `alembic upgrade head` to apply all)

**Documentation** (`docs/`)
- `specs/` — Design documents and product specs
- `PRODUCT.md` — Product brief and brand philosophy

#### Tech Stack Summary
| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS |
| **Backend** | FastAPI, SQLAlchemy 2.0, Alembic, Passlib (auth) |
| **Database** | PostgreSQL 16, asyncpg (async driver) |
| **Deployment** | Docker Compose (dev), Docker (production) |
| **Package Manager** | npm (frontend), pip/uv (backend) |

#### Data Flow (Example: Dashboard Load)
1. User logs in via frontend, receives JWT token
2. Frontend stores token, uses it for all API requests
3. User clicks "Dashboard"
4. Frontend calls `GET /api/dashboard/metrics`
5. Backend validates token, queries database for team-scoped metrics
6. Database returns results, backend aggregates and returns
7. Frontend renders charts and tables

---

### Section 7: Contributing & Next Steps
**Purpose**: Guide contributors on how to add features and find relevant docs  
**Target Audience**: Developers, architects

**Outline**:

#### Making Backend Changes
1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make changes in `backend/app/`
3. If schema changes needed:
   - Create migration: `alembic revision -m "Add new_column to users"`
   - Edit the migration file in `backend/alembic/versions/`
   - Test: `alembic upgrade head`
4. Run tests: `pytest tests/`
5. Commit and push, open PR

#### Making Frontend Changes
1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make changes in `frontend/src/`
3. Test locally: `npm run dev`
4. Commit and push, open PR

#### Finding Patterns & Examples
- **New API endpoint?** Check `backend/app/routers/` for existing patterns (routing, auth guards, error handling)
- **New React page?** Check `frontend/src/pages/` for existing patterns (hooks, API calls, styling)
- **New database table?** Check `backend/app/models/` and `backend/alembic/versions/` for patterns

#### Common Tasks
- **Fix a bug**: Start with local setup, create branch, fix, run tests, commit
- **Add a feature**: Design first (update docs), then implement, then test
- **Change the database schema**: Create Alembic migration, test locally, commit separately
- **Deploy to production**: See deployment notes (link to ops docs or deployment guide)

#### Questions or Issues?
- Check `docs/` for design specs and product context
- See existing issues/PRs for similar problems
- [Link to team Slack channel / Issue tracker / Wiki]

---

## Design Rationale

### Why This Order?
1. **Quick Start first** → Developers want to see it working immediately
2. **Product Overview second** → Context for what they just ran
3. **Auth Flow third** → Critical for Phase 3; users need to understand sign-up
4. **Local Dev fourth** → For people building features
5. **Architecture fifth** → For people extending the system
6. **Contributing last** → Specific guidance once they understand the shape

### Why Signposts?
Readers have different needs. Signposts let experienced developers skip product overview and jump to code. New team members can read linearly without getting confused about "why am I setting up Python?"

### Why Auth Gets Its Own Section?
Authentication is often confusing, especially for invite-only systems. A dedicated section with flow diagram and step-by-step instructions removes ambiguity for new users and admins.

### Why Both Docker and Local Dev?
- Docker is fastest for "see it working"
- Local dev is fastest for "build features"
- Hybrid gives maximum flexibility

---

## Completeness Checklist

- [x] Covers all three audiences (developers, team members, partners)
- [x] Auth flow is clear and step-by-step
- [x] Quick Start is genuinely quick (<5 minutes)
- [x] Local dev setup is complete (Python + Node + DB)
- [x] Architecture diagram and directory guide included
- [x] Tech stack is documented
- [x] Contributing workflow is clear
- [x] Signposts guide readers to relevant sections
- [x] Tone matches product philosophy (friendly, clear, precise)
- [x] No unnecessary jargon or marketing

---

## Out of Scope (Intentionally)
- Phase 4 roadmap / EasyOrders integration details (too early, documented separately in design specs)
- Detailed API reference (link to generated API docs instead)
- Troubleshooting / known issues (separate TROUBLESHOOTING.md can handle this later)
- Deployment to production (separate DEPLOYMENT.md or ops runbook)

---

## Next Steps
1. Review this spec with stakeholders
2. Write the README.md using this spec as a blueprint
3. Use humanizer skill for tone and readability
4. Commit to repository

