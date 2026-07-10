# Backend Core

Root: `backend/`

## Directory map

```
app/
  main.py              — FastAPI app, CORS, router registration
  core/
    config.py          — pydantic-settings Settings (reads .env)
    security.py        — hash_password, verify_password, create_access/refresh_token,
                         decode_token, encrypt_token, decrypt_token (Fernet)
    database.py        — async engine, AsyncSessionLocal, Base, get_db()
  models/
    user.py            — User (id, email, full_name, hashed_password, role, is_active)
    target.py          — Target (scope=team|user, user_id nullable, all target fields)
    platform_connection.py — PlatformConnection (user_id, platform, external_account_id,
                             encrypted tokens, token_expires_at, last_synced_at)
    ad_insight.py      — AdInsight (grain key uq_insight_grain, all raw metric columns)
    order_funnel.py    — OrderFunnelEntry (grain uq_funnel_grain, order counts + basket)
  schemas/             — Pydantic v2 schemas (auth, user, target, ad_insight, funnel)
  services/
    metrics.py         — ALL derived KPI functions (pure, no I/O). Single source of truth.
  connectors/
    base.py            — AdConnector ABC + NormalizedInsight dataclass
    (meta/tiktok/snapchat.py — Phase 3)
  api/
    deps.py            — CurrentUser, AdminUser, DB type aliases
    routers/
      auth.py          — POST /api/auth/login, /api/auth/refresh
      users.py         — GET/PUT /api/users/me, admin CRUD /api/users/
      targets.py       — team + per-user target CRUD + effective resolution
      (insights, funnel, platform, leaderboard — Phase 2/3)
alembic/
  env.py               — async migration runner; imports app.models package
  versions/            — migration files
tests/
  test_metrics.py      — 46 unit tests; fixtures from Excel sample rows
  test_api/            — integration tests (Phase 2+)
```

## Models to add when registering new connectors (Phase 3)

Add import to `app/models/__init__.py` AND `alembic/env.py`'s `import app.models`.
