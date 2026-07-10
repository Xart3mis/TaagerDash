# Frontend Core

Root: `frontend/`

## Directory map

```
src/
  types/index.ts       — All shared TS interfaces (User, Targets, AdInsight, DerivedMetrics,
                         OrderFunnelEntry, FunnelDerivedMetrics, LeaderboardEntry)
  services/api.ts      — axios instance (base /api, JWT interceptor, 401→redirect)
  App.tsx              — Routes + RequireAuth guard
  main.tsx             — ReactDOM root, QueryClientProvider, BrowserRouter
  pages/
    LoginPage.tsx      — email/password form → POST /api/auth/login → localStorage tokens
    DashboardPage.tsx  — Overall total + by-platform + by-campaign (Phase 2)
    LeaderboardPage.tsx — Cross-buyer ranking (Phase 2)
    FunnelEntryPage.tsx — Manual order funnel form (Phase 2)
    TargetsPage.tsx    — Team + user targets config (Phase 2)
  components/
    Layout.tsx         — Top nav (Dashboard / Leaderboard / Funnel Entry / Targets) + Outlet
```

## Phase 2 wiring pattern

Each page should use TanStack Query `useQuery` → `api.get(...)` and render data.
Add new routes to App.tsx and new nav links to Layout.tsx as pages are built out.
