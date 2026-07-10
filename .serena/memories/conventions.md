# Conventions

## Backend

- **Never store derived metrics** — CTR, CPC, CPM, ROAS, CPA, CVR, AOV, hook_rate, funnel %s
  all live only in `app/services/metrics.py`. Aggregation endpoints call `derive_all()` /
  `derive_funnel_all()` after summing raw counts.
- **Always aggregate raw counts, then derive.** Never average derived ratios across rows.
- SQLAlchemy models use `Mapped[T]` + `mapped_column()` (SA 2.x style). All relationships use
  string forward refs (e.g. `"User"`).
- Alembic env.py imports `app.models` (the package) to register all tables on `Base.metadata`.
  Any new model module must be imported there too.
- FastAPI dependency type aliases defined in `app/api/deps.py`: `CurrentUser`, `AdminUser`, `DB`.
  Use these in router signatures — never repeat `Depends(...)` inline.
- Routers included in `app/main.py` with prefix `/api`. Add new routers there.
- `platform_connections.encrypted_access_token` / `encrypted_refresh_token` are always
  Fernet-encrypted strings. Decrypt before passing to connectors; encrypt before saving.

## Connectors (Phase 3)

- Each platform connector subclasses `AdConnector` from `app/connectors/base.py`.
- Must implement `fetch_insights()` → `list[NormalizedInsight]` and `refresh_access_token()`.
- All field normalization and USD currency conversion happens inside the connector.
- The ingestion service never knows which platform it calls.

## Frontend

- API calls go through `src/services/api.ts` (axios instance). Never use raw `fetch`.
- Types shared across pages in `src/types/index.ts`.
- Pages live in `src/pages/`, shared UI in `src/components/`.
- Auth guard: `RequireAuth` wrapper in `App.tsx` checks `localStorage.access_token`.

## Testing

- `tests/test_metrics.py` fixtures are the Excel sample row values — keep them in sync
  if the metrics formulas change.
- All new backend routes need integration tests in `tests/test_api/`.
