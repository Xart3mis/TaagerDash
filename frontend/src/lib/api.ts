// Centralized API client — all fetch calls go through here.
// Attaches Bearer token, normalizes errors, and redirects to /login on 401.

export type Platform = 'meta' | 'tiktok' | 'snapchat'

// ---------------------------------------------------------------------------
// Response types (mirror the Pydantic schemas)
// ---------------------------------------------------------------------------

export interface MetricsSummary {
  spend: number
  impressions: number
  link_clicks: number
  results?: number | null
  revenue?: number | null
  purchases?: number | null
  budget?: number | null
  three_sec_views?: number | null
  landing_page_views?: number | null
  add_to_cart?: number | null
  initiate_checkout?: number | null
  leads?: number | null
  pacing?: number | null
  ctr?: number | null
  cpc?: number | null
  cpm?: number | null
  hook_rate?: number | null
  click_to_lpv?: number | null
  lpv_to_atc?: number | null
  atc_to_ic?: number | null
  ic_to_purchase?: number | null
  lpv_to_lead?: number | null
  cvr?: number | null
  cpa?: number | null
  roas?: number | null
  aov?: number | null
  cpa_cap_status?: string | null
}

export interface PlatformSummary extends MetricsSummary {
  platform: Platform
}

export interface CampaignSummary extends MetricsSummary {
  campaign: string
  platform: Platform
}

export interface BuyerSummary extends MetricsSummary {
  user_id: number
  full_name: string
  rank: number
}

export interface AdInsightCreate {
  date: string
  platform: Platform
  campaign: string
  product?: string
  creative?: string
  funnel_type?: string
  budget?: number | null
  spend: number
  impressions: number
  link_clicks: number
  reach?: number | null
  frequency?: number | null
  three_sec_views?: number | null
  landing_page_views?: number | null
  add_to_cart?: number | null
  initiate_checkout?: number | null
  purchases?: number | null
  revenue?: number | null
  leads?: number | null
  qualified_leads?: number | null
  results?: number | null
}

export interface AdInsightRead extends AdInsightCreate {
  id: number
  user_id: number
}

export interface FunnelEntryCreate {
  date: string
  store_or_lp: string
  source: string
  placed_orders: number
  confirmed_orders?: number | null
  shipped_orders?: number | null
  delivered_orders?: number | null
  cancelled_orders?: number | null
  basket_value?: number | null
  items?: number | null
}

export interface FunnelDerivedMetrics {
  confirmation_rate?: number | null
  delivery_rate?: number | null
  fulfillment_rate?: number | null
  rto_rate?: number | null
  cancellation_rate?: number | null
  avg_basket?: number | null
  items_per_order?: number | null
  confirmation_status?: string | null
  delivery_status?: string | null
  fulfillment_status?: string | null
  rto_status?: string | null
}

export interface FunnelEntryRead extends FunnelEntryCreate {
  id: number
  user_id: number
  metrics: FunnelDerivedMetrics
}

export interface TargetBase {
  target_ctr?: number | null
  target_roas?: number | null
  cpa_cap?: number | null
  target_confirmation?: number | null
  target_delivery?: number | null
  target_fulfillment?: number | null
  max_rto?: number | null
}

export interface TargetRead extends TargetBase {
  id: number
  scope: 'team' | 'user'
  user_id?: number | null
}

export interface UserRead {
  id: number
  email: string
  full_name: string
  role: 'buyer' | 'admin'
  is_active: boolean
}

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

const BASE = '/api'

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('access_token')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: string }
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

// ---------------------------------------------------------------------------
// API surface
// ---------------------------------------------------------------------------

export interface FilterParams {
  start_date: string
  end_date: string
  platform?: Platform | ''
}

export const api = {
  insights: {
    summary: (p: FilterParams) =>
      request<MetricsSummary>(`/insights/summary?${qs(p)}`),
    byPlatform: (p: { start_date: string; end_date: string }) =>
      request<PlatformSummary[]>(`/insights/by-platform?${qs(p)}`),
    byCampaign: (p: FilterParams) =>
      request<CampaignSummary[]>(`/insights/by-campaign?${qs(p)}`),
    leaderboard: (p: FilterParams & { sort_by?: string }) =>
      request<BuyerSummary[]>(`/insights/leaderboard?${qs(p)}`),
    list: (p: { start_date?: string; end_date?: string; platform?: Platform }) =>
      request<AdInsightRead[]>(`/insights?${qs(p)}`),
    upsert: (data: AdInsightCreate) =>
      request<AdInsightRead>('/insights/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/insights/${id}`, { method: 'DELETE' }),
  },

  funnel: {
    list: (p: { start_date?: string; end_date?: string; store_or_lp?: string }) =>
      request<FunnelEntryRead[]>(`/funnel?${qs(p)}`),
    upsert: (data: FunnelEntryCreate) =>
      request<FunnelEntryRead>('/funnel/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: FunnelEntryCreate) =>
      request<FunnelEntryRead>(`/funnel/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      request<void>(`/funnel/${id}`, { method: 'DELETE' }),
  },

  targets: {
    myEffective: () =>
      request<TargetBase>('/targets/me/effective'),
    mine: () =>
      request<TargetRead | null>('/targets/me'),
    updateMine: (data: TargetBase) =>
      request<TargetRead>('/targets/me', {
        method: 'PUT',
        body: JSON.stringify({ ...data, scope: 'user' }),
      }),
    team: () =>
      request<TargetRead>('/targets/team'),
    updateTeam: (data: TargetBase) =>
      request<TargetRead>('/targets/team', {
        method: 'PUT',
        body: JSON.stringify({ ...data, scope: 'team' }),
      }),
  },

  users: {
    me: () => request<UserRead>('/users/me'),
  },
}
