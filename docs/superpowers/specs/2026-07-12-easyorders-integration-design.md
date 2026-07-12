# EasyOrders Integration Design

**Date:** 2026-07-12  
**Status:** Approved  
**Scope:** EasyOrders store connection, automated order funnel, per-product performance page, platform connection management UI

---

## 1. Overview

Integrate TaagerDash with EasyOrders to replace manual `OrderFunnelEntry` input with fully automated webhook-driven funnel tracking, and add a per-product performance page that joins EasyOrders order revenue with AdInsight ad spend to derive per-product ROAS.

Each buyer connects their own EasyOrders store via an App Link authorization flow. The Profile page is extended to also surface connection management for all platforms (EasyOrders, Meta, TikTok, Snapchat) in a unified section.

Manual funnel entry — the `POST /api/funnel/` endpoint, the upsert logic, and the FunnelEntryPage form — is removed entirely.

---

## 2. Authorization — EasyOrders App Link Flow

### Mechanism

EasyOrders provides an "Authorized App Link" — a URL the buyer opens in their browser that triggers an app-install consent screen. On approval, EasyOrders:
- POSTs `{ api_key, store_id }` to TaagerDash's `callback_url`
- Auto-registers webhooks for `order-created` and `order-status-update` at the configured URLs
- Redirects the buyer to `redirect_url`

### Install URL shape

```
https://app.easy-orders.net/#/install-app
  ?app_name=TaagerDash
  &app_description=Taager+media+buying+performance+dashboard
  &app_icon=<ICON_URL>
  &permissions=products:read,orders:read
  &callback_url=https://<HOST>/api/easyorders/callback
  &orders_webhook=https://<HOST>/api/easyorders/webhooks/orders
  &order_status_webhook=https://<HOST>/api/easyorders/webhooks/order-status
  &redirect_url=https://<HOST>/profile
```

### New backend endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/easyorders/install` | CurrentUser | Returns the install URL for the authenticated buyer |
| POST | `/api/easyorders/callback` | Public (verified by store_id lookup) | Receives `{api_key, store_id}` from EasyOrders; saves connection |
| DELETE | `/api/easyorders/connection` | CurrentUser | Disconnects the buyer's store |
| GET | `/api/easyorders/connection` | CurrentUser | Returns connection status and store_id |

### Credential storage

`EasyOrdersConnection` stores per-buyer credentials following the same Fernet-encryption pattern as the existing `PlatformConnection` model. The `webhook_secret` (sent in the `secret` header of every inbound webhook) is also stored encrypted and verified on every webhook delivery.

---

## 3. Data Models

### New: `easy_orders_connections`

```
id              int, PK
user_id         int, FK → users (CASCADE DELETE), UNIQUE
store_id        str(255), indexed
api_key         str(512), Fernet-encrypted
webhook_secret  str(512), Fernet-encrypted
connected_at    datetime
```

Unique on `user_id` — one store per buyer.

### New: `easy_orders_orders`

```
id              int, PK
user_id         int, FK → users (CASCADE DELETE)
eo_order_id     str(255), UNIQUE — EasyOrders UUID, prevents double-processing
store_id        str(255)
order_date      date — extracted from order created_at
current_status  str(64)
```

Unique on `eo_order_id`. Used for deduplication and as date-lookup for status update events.

### New: `easy_orders_order_items`

```
id              int, PK
eo_order_id     str(255), FK → easy_orders_orders.eo_order_id (CASCADE DELETE)
eo_product_id   str(255)
taager_code     str(255), nullable
quantity        int
price           float
```

Populated once at `order-created` time from `cart_items`. Never updated. Powers product-level revenue aggregation.

### New: `easy_orders_products`

```
id              int, PK
user_id         int, FK → users (CASCADE DELETE)
eo_product_id   str(255)
name            str(255)
sku             str(255), nullable
taager_code     str(255), nullable, indexed
price           float
synced_at       datetime
```

Unique on `(user_id, eo_product_id)`. Synced on connect and on-demand.

### Modified: `order_funnel_entries`

No schema changes. Write access removed from the API layer — the table is populated exclusively by webhook processors. `store_or_lp` maps to EasyOrders `store_id`; `source` is hardcoded to `"easyorders"` on all auto-created entries.

---

## 4. Order Funnel Automation

### Removed

- `POST /api/funnel/` (upsert endpoint)
- `PUT /api/funnel/{id}` (if it existed)
- `FunnelEntryPage` manual form and all associated form state/handlers

### Webhook: `POST /api/easyorders/webhooks/orders` — `order-created`

1. Verify `secret` header against `webhook_secret` for the `store_id` in the payload
2. Lookup `easy_orders_orders` by `eo_order_id` — if exists, return 200 (idempotent)
3. Insert `EasyOrdersOrder` (`order_date` from `created_at`, `current_status = "pending"`)
4. Insert `EasyOrdersOrderItem` rows from `cart_items`
5. Upsert `OrderFunnelEntry` for `(order_date, user_id, store_id, "easyorders")`:
   - `placed_orders += 1`
   - `basket_value += SUM(item.price × item.quantity)`
   - `items += SUM(item.quantity)`

All steps in a single DB transaction. Returns 200 immediately.

### Webhook: `POST /api/easyorders/webhooks/order-status` — `order-status-update`

1. Verify `secret` header
2. Lookup `EasyOrdersOrder` by `eo_order_id`. If not found, call `GET /api/v1/external-apps/orders/:id` to backfill
3. If `new_status == current_status`, return 200 (idempotent)
4. Lookup `OrderFunnelEntry` for the order's `order_date`
5. Apply transition — decrement old stage, increment new stage:

| EasyOrders status | Funnel column |
|---|---|
| `pending` | `placed_orders` |
| `confirmed` / `paid` | `confirmed_orders` |
| `shipped` | `shipped_orders` |
| `delivered` | `delivered_orders` |
| `cancelled` | `cancelled_orders` |

6. Update `EasyOrdersOrder.current_status = new_status`

All steps in a single DB transaction.

---

## 5. Product Performance

### Product sync

- Triggered automatically on EasyOrders connect
- Available on-demand: `POST /api/easyorders/products/sync` (CurrentUser)
- Calls `GET https://api.easy-orders.net/api/v1/external-apps/products` with the buyer's `api_key`
- Upserts into `easy_orders_products` keyed on `(user_id, eo_product_id)`

### Performance endpoint

**`GET /api/easyorders/products/performance`**  
Query params: `start_date`, `end_date`  
Auth: CurrentUser

Returns per product:
```json
{
  "eo_product_id": "...",
  "name": "...",
  "sku": "...",
  "taager_code": "...",
  "total_orders": 42,
  "total_revenue": 9240.0,
  "total_spend": 1800.0,
  "roas": 5.13
}
```

Derivation:
- `total_orders` — COUNT DISTINCT `eo_order_id` from `easy_orders_order_items` joined to `easy_orders_orders` for the date range
- `total_revenue` — SUM(`price × quantity`) from `easy_orders_order_items`
- `total_spend` — SUM(`spend`) from `ad_insights` WHERE `taager_code` matches (nullable)
- `roas` — `total_revenue / total_spend` via existing `_safe_div` helper (null if no spend)

The join key is `taager_code`. Products with no matching `ad_insights` row show revenue but `roas = null`.

---

## 6. Frontend Changes

### Routing

New route added to `App.tsx`:
```tsx
<Route path="products" element={<ProductsPage />} />
```

Accessible to all authenticated buyers (not admin-only).

### Layout nav

`BUYER_LINKS` in `Layout.tsx` gains one entry:
```ts
{ to: '/products', label: 'Products', icon: BarChart3 }
```

`BarChart3` is already imported in `Layout.tsx`.

### `ProfilePage` — Platform Connections section

New "Platform Connections" card added below existing profile fields. Shows all four platforms in a uniform row/card pattern:

| Platform | Status | Action |
|---|---|---|
| EasyOrders | Connected (store ID shown) / Disconnected | Connect / Disconnect + Sync Products |
| Meta | Connected / Disconnected | Connect (OAuth) / Disconnect |
| TikTok | Connected / Disconnected | Connect (OAuth) / Disconnect |
| Snapchat | Connected / Disconnected | Connect (OAuth) / Disconnect |

Meta, TikTok, and Snapchat connect buttons are visible but marked "Coming soon" — the UI shells are built now; the OAuth flows activate when Phase 3 connectors are implemented.

### `FunnelEntryPage` — manual form removed

- All create/edit form state and handlers deleted
- Page becomes a read-only list of funnel entries with derived KPIs (existing GET display logic kept)
- Empty state when no EasyOrders connection: "Connect your EasyOrders store in Profile to start tracking your funnel automatically"

### `ProductsPage` — new standalone page

- Date range filter (reuses `defaultDateRange()` utility)
- Table columns: Name, SKU, Taager Code, Orders, Revenue, Ad Spend, ROAS
- ROAS and Ad Spend cells show "—" when no linked AdInsight data
- "Sync Products" button triggers `POST /api/easyorders/products/sync`

---

## 7. What Is NOT in Scope

- Shipping area sync (`PATCH /api/v1/external-apps/shipping`) — not needed for the dashboard use case
- Pushing products to EasyOrders — TaagerDash reads only
- Full OAuth implementation for Meta / TikTok / Snapchat — Phase 3
- Order-level detail view (individual order records) — aggregate funnel view only
- Multi-store per buyer — one EasyOrders connection per buyer for now

---

## 8. Alembic Migrations Required

Four new tables:
1. `easy_orders_connections`
2. `easy_orders_orders`
3. `easy_orders_order_items`
4. `easy_orders_products`

One new migration file covering all four (single migration, applied together).
