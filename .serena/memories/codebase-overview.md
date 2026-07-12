# TaagerDash — Full Codebase Overview

## Product Purpose
A **private, invite-only ad performance dashboard** for the Taager media buying team. Centralizes cross-platform ad metrics (Meta, TikTok, Snapchat), derived KPIs, order funnel data, and per-user performance benchmarks. Goal: a buyer opens the dashboard, reads their numbers, spots what's off, and acts — within 60 seconds.

## Tech Stack

### Backend (`/backend`)
- **Framework**: FastAPI (async) with Uvicorn
- **ORM**: SQLAlchemy 2.x (async, `mapped_column` style) + Alembic migrations
- **DB**: PostgreSQL (asyncpg driver), `postgresql+asyncpg://`
- **Auth**: JWT (python-jose) — access + refresh tokens; bcrypt password hashing (passlib)
- **Token encryption**: Fernet (cryptography lib) for OAuth tokens at rest
- **Validation**: Pydantic v2 + pydantic-settings
- **HTTP client**: httpx (for platform connectors, Phase 3)
- **Scheduling**: APScheduler (Phase 3 ingestion, not yet wired)
- **Testing**: pytest (46+ tests in `tests/test_metrics.py`)

### Frontend (`/frontend`)
- **Framework**: React 18 + TypeScript + Vite
- **Routing**: react-router-dom v6 (nested routes, `<Outlet>`)
- **Data fetching**: TanStack Query (React Query) — `staleTime: 60_000`
- **Styling**: Tailwind CSS v3 + Inter variable font (`@fontsource-variable/inter`)
- **Icons**: lucide-react
- **HTTP**: axios (via `src/lib/api.ts`)

### Infrastructure
- Docker Compose: `db` (postgres:16-alpine), `backend` (:8000), `frontend` (:5173)
- DB name: `adtracker`

---

## Backend Structure

### Entry Point
`app/main.py` — FastAPI app, CORS middleware (allows `settings.FRONTEND_ORIGIN`), mounts all routers under `/api`.

### Config (`app/core/config.py`)
`Settings` (pydantic-settings, reads `.env`):
- `DATABASE_URL`, `SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES` (60), `REFRESH_TOKEN_EXPIRE_DAYS` (30)
- `TOKEN_ENCRYPTION_KEY` (Fernet)
- `META_APP_ID/SECRET/REDIRECT_URI`, `TIKTOK_*`, `SNAPCHAT_*`
- `FRONTEND_ORIGIN`

### Security (`app/core/security.py`)
- `hash_password` / `verify_password` (bcrypt)
- `create_access_token` / `create_refresh_token` / `decode_token` (JWT)
- Fernet encryption/decryption for OAuth tokens

### Dependencies (`app/api/deps.py`)
Type aliases used in all routers:
- `CurrentUser = Annotated[User, Depends(get_current_user)]`
- `AdminUser = Annotated[User, Depends(require_admin)]`
- `DB = Annotated[AsyncSession, Depends(get_db)]`

---

## Data Models

### `User`
- `id`, `email` (unique, indexed), `full_name`, `hashed_password`
- `role: UserRole` enum — `buyer` | `admin`
- `is_active: bool`
- Relationships: `connections` (PlatformConnection), `ad_insights` (AdInsight), `funnel_entries` (OrderFunnelEntry), `targets`
- M2M with `Team` via `team_members` association table

### `Team`
- `id`, `name`
- M2M with `User` via `team_members` association table

### `InviteToken`
- `id`, `token` (unique), `created_at`, `expires_at`, `used_at` (nullable)
- Invite-only registration; locked with `with_for_update()` to prevent race-condition double-use

### `Target` (TargetScope enum: `team` | `user`)
- `id`, `scope`, `user_id` (nullable for team targets), `cpa_cap`, `budget`
- Funnel targets: `target_confirmation`, `target_delivery`, `target_fulfillment`, `max_rto`

### `AdInsight`
- `id`, `user_id`, `date`, `platform` (Platform enum: `meta`|`tiktok`|`snapchat`), `campaign`, `product`, `creative`, `funnel_type`
- Raw metrics: `spend`, `impressions`, `link_clicks`, `results`, `revenue`, `purchases`
- Funnel: `three_sec_views`, `landing_page_views`, `add_to_cart`, `initiate_checkout`, `leads`
- Extra: `frequency`, `budget`

### `OrderFunnelEntry`
- `id`, `user_id`, `date`, `store_or_lp`, `source`
- Counts: `placed_orders`, `confirmed_orders`, `shipped_orders`, `delivered_orders`, `cancelled_orders`
- Values: `basket_value`, `items`
- Unique on: `date × user_id × store_or_lp × source`

### `PlatformConnection`
- `id`, `user_id`, `platform`, `access_token` (Fernet-encrypted), `refresh_token`, `expires_at`

---

## API Routers (all under `/api`)

### `/api/auth` — auth.py
- `POST /register` — invite-token-gated registration, returns JWT pair
- `POST /login` — email/password, returns JWT pair
- `POST /refresh` — rotates access token from refresh token

### `/api/users` — users.py
- `GET /users/me`, `PATCH /users/me/profile`, `POST /users/me/password`, `POST /users/me/email`
- Admin: `GET /users/`, `GET /users/{id}`, `PATCH /users/{id}`, `DELETE /users/{id}`

### `/api/targets` — targets.py
- `GET /targets/effective` — merged team+user targets for current buyer
- `GET/PUT /targets/team` — admin: team-wide targets
- `GET/PUT /targets/user/{user_id}` — admin: per-buyer targets
- `GET/PUT /targets/me` — buyer's own target overrides
- `GET /targets/user/{user_id}/effective` — admin view

### `/api/insights` — insights.py
- `POST /insights/` — create AdInsight (seed / connector upserts)
- `GET /insights/` — list buyer's insights (date, platform, campaign filters)
- `GET /insights/summary` — aggregated MetricsSummary for current buyer
- `GET /insights/daily` — day-by-day DailyMetrics
- `GET /insights/platforms` — per-platform PlatformSummary list
- `GET /insights/campaigns` — per-campaign CampaignSummary list
- `GET /insights/leaderboard` — admin only; BuyerSummary ranked by spend (sortable)

### `/api/funnel` — funnel.py
- `POST /funnel/` — upsert funnel entry (idempotent on date×store_or_lp×source)
- `GET /funnel/` — list buyer's entries with derived KPIs
- `GET /funnel/{id}` — single entry with metrics

### `/api/invites` — invites.py (admin)
- CRUD for invite tokens

### `/api/teams` — teams.py (admin)
- CRUD teams, `POST /{id}/members`, `DELETE /{id}/members/{user_id}`

---

## Metrics Service (`app/services/metrics.py`)

Single source of truth for all derived KPIs. Pure functions — no I/O.

**Ad metrics:** `pacing`, `ctr`, `cpc`, `cpm`, `hook_rate`, `click_to_lpv`, `lpv_to_atc`, `atc_to_ic`, `ic_to_purchase`, `lpv_to_lead`, `cvr`, `cpa`, `roas`, `aov`, `cpa_cap_status`, `derive_all`

**Funnel metrics:** `confirmation_rate`, `delivery_rate`, `fulfillment_rate`, `rto_rate`, `cancellation_rate`, `avg_basket`, `items_per_order`, `funnel_status`, `derive_funnel_all`

**Critical rule**: Always aggregate raw counts in SQL first, then pass totals to `derive_all()` — never average derived ratios.

---

## Frontend Structure

### Entry (`src/main.tsx`)
React 18, BrowserRouter, QueryClientProvider (staleTime 60s, retry 1).

### Routing (`src/App.tsx`)
- `/login`, `/signup` — public
- `/` → RequireAuth → Layout (Outlet):
  - `/dashboard`, `/funnel`, `/targets`, `/profile` — all buyers
  - `/leaderboard`, `/teams`, `/invites` — RequireAdmin only

### Auth utils (`src/utils/auth.ts`)
`getTokenRole()` — decodes JWT from `localStorage.access_token` to read role claim.

### API client (`src/lib/api.ts`)
Axios, base URL from `VITE_API_URL`. Bearer token from localStorage. 401 → refresh-token rotation.

### Layout (`src/components/Layout.tsx`)
- Desktop sidebar + mobile bottom nav (max 5 items)
- Buyer links: Dashboard, Funnel, Targets
- Admin extras: Leaderboard, Teams, Invites
- Profile (top-right) → `/profile`; logout clears localStorage

### Pages
- **DashboardPage** — date-range MetricsSummary; platform/campaign breakdowns; daily chart
- **FunnelEntryPage** — upsert OrderFunnelEntry; list with derived KPIs
- **TargetsPage** — buyer edits own targets; admin sees team + per-buyer targets
- **LeaderboardPage** (admin) — ranked BuyerSummary; date/platform/sort filters
- **TeamsPage** (admin) — create teams, add/remove members
- **InvitesPage** (admin) — generate + list invite tokens
- **ProfilePage** — update name, change password, change email
- **LoginPage** / **SignUpPage** — SignUpPage reads `?token` from URL

### Types (`src/types/index.ts`)
Mirrors backend schemas: `User`, `UserRole`, `Platform`, `MetricsSummary`, `BuyerSummary`, `DailyMetrics`, `PlatformSummary`, `CampaignSummary`, `OrderFunnelRead`, `FunnelDerivedMetrics`, `FunnelEntryWithMetrics`, `Target`, `EffectiveTargets`, `Team`, `InviteToken`.

---

## Connectors (`app/connectors/`)
- `base.py` — abstract `AdConnector` interface + `NormalizedInsight` schema
- Individual connectors (meta.py, tiktok.py, snapchat.py) — Phase 3, not yet implemented

---

## Key Conventions
- All DB access is async (`AsyncSession`, `await db.execute(...)`)
- Target resolution: user-level target overrides team-level (merge pattern)
- Insights aggregation: `SUM()` raw counts in SQL, then `derive_all()` — never average rates
- Invite registration: `SELECT ... FOR UPDATE` prevents race-condition double-use
- JWT role claim drives both backend (`require_admin` dep) and frontend (`getTokenRole()`) access control
- Design: WCAG AA; `prefers-reduced-motion` support; "warm precision" tone; density earned gradually
