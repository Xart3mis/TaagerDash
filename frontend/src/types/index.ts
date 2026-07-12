// ── Auth ────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  invite_token: string
  email: string
  full_name: string
  password: string
  confirm_password: string
}

/** Returned only from POST /invites/ — includes the raw token for sharing. */
export interface InviteTokenCreated {
  id: number
  token: string
  created_by_id: number
  expires_at: string
  used_at: string | null
  used_by_email: string | null
  created_at: string
}

/** Returned from GET /invites/ — token field omitted for security. */
export interface InviteToken {
  id: number
  created_by_id: number
  expires_at: string
  used_at: string | null
  used_by_email: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: number
  email: string
  full_name: string
  role: 'buyer' | 'admin'
  is_active: boolean
}

// ── Targets ─────────────────────────────────────────────────────────────────

export interface Targets {
  target_ctr: number | null
  target_roas: number | null
  cpa_cap: number | null
  target_confirmation: number | null
  target_delivery: number | null
  target_fulfillment: number | null
  max_rto: number | null
}

// ── Ad Insights ─────────────────────────────────────────────────────────────

export type Platform = 'meta' | 'tiktok' | 'snapchat'

export interface AdInsight {
  id: number
  user_id: number
  date: string
  platform: Platform
  campaign: string
  product: string
  creative: string
  funnel_type: string
  budget: number | null
  spend: number
  impressions: number
  reach: number | null
  frequency: number | null
  link_clicks: number
  three_sec_views: number | null
  landing_page_views: number | null
  add_to_cart: number | null
  initiate_checkout: number | null
  purchases: number | null
  revenue: number | null
  leads: number | null
  qualified_leads: number | null
  results: number | null
}

export interface DerivedMetrics {
  pacing: number | null
  ctr: number | null
  cpc: number | null
  cpm: number | null
  hook_rate: number | null
  click_to_lpv: number | null
  lpv_to_atc: number | null
  atc_to_ic: number | null
  ic_to_purchase: number | null
  lpv_to_lead: number | null
  cvr: number | null
  cpa: number | null
  roas: number | null
  aov: number | null
  cpa_cap_status: 'OK' | 'Over Cap' | null
}

export interface InsightWithMetrics extends AdInsight {
  metrics: DerivedMetrics
}

// ── Order Funnel ─────────────────────────────────────────────────────────────

export interface OrderFunnelEntry {
  id: number
  user_id: number
  date: string
  store_or_lp: string
  source: string
  placed_orders: number
  confirmed_orders: number | null
  shipped_orders: number | null
  delivered_orders: number | null
  cancelled_orders: number | null
  basket_value: number | null
  items: number | null
}

export interface FunnelDerivedMetrics {
  confirmation_rate: number | null
  delivery_rate: number | null
  fulfillment_rate: number | null
  rto_rate: number | null
  cancellation_rate: number | null
  avg_basket: number | null
  items_per_order: number | null
  confirmation_status: 'On Track' | 'Below' | null
  delivery_status: 'On Track' | 'Below' | null
  fulfillment_status: 'On Track' | 'Below' | null
  rto_status: 'On Track' | 'Below' | null
}

// ── Leaderboard ──────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  user: User
  metrics: DerivedMetrics & { spend: number; impressions: number; link_clicks: number }
  rank: number
  over_cpa_cap: boolean
}
