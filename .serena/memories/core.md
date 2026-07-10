# Consolidated Ad Dashboard — Core

Custom web app replacing per-buyer Excel ad trackers.
Consolidates TikTok + Meta + Snapchat ad performance across a small team (<10 buyers).

## Layout

```
backend/   FastAPI + SQLAlchemy async + Alembic + pytest  (see `mem:backend/core`)
frontend/  React 18 + Vite + TypeScript + Tailwind + Recharts  (see `mem:frontend/core`)
docker-compose.yml  — Postgres 16 + backend + frontend
```

## Key invariants

- All derived KPIs (CTR/CPC/CPM/ROAS/CPA/CVR/AOV/hook-rate/funnel %s) are computed in
  `backend/app/services/metrics.py` only — never stored in DB, never re-derived elsewhere.
- Ad insight grain: date × user × platform × campaign × product × creative × funnel_type
  (UniqueConstraint `uq_insight_grain`). Upserts must be idempotent on this key.
- Target resolution: user override wins per-field over team default. Logic in
  `backend/app/api/routers/targets.py::_merge_targets`.
- Platform OAuth tokens stored encrypted (Fernet) — encrypt/decrypt via
  `backend/app/core/security.py::{encrypt_token,decrypt_token}`.
- Store/order funnel data is manual-entry only (no ad-platform API source).

## Phases

1. Foundation (DONE): scaffold, auth, models, metrics module + 46 tests green.
2. Manual data + aggregation + dashboard + leaderboard UI.
3. Platform connectors (Meta/TikTok/Snapchat), OAuth, ingestion scheduler.
4. Hardening: retry, deploy config.

## Cross-cutting references

- Tech stack details: `mem:tech_stack`
- Dev/test commands: `mem:suggested_commands`
- Code conventions: `mem:conventions`
- Task completion checklist: `mem:task_completion`
