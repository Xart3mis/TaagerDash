from typing import Optional
from pydantic import BaseModel


class MetricsSummary(BaseModel):
    """Aggregated raw counts + derived KPIs for a rolled-up time window."""
    # Raw aggregates
    spend: float = 0
    impressions: int = 0
    link_clicks: int = 0
    results: Optional[int] = None
    revenue: Optional[float] = None
    purchases: Optional[int] = None
    budget: Optional[float] = None
    three_sec_views: Optional[int] = None
    landing_page_views: Optional[int] = None
    add_to_cart: Optional[int] = None
    initiate_checkout: Optional[int] = None
    leads: Optional[int] = None
    # Derived KPIs (computed at query time, not stored)
    pacing: Optional[float] = None
    ctr: Optional[float] = None
    cpc: Optional[float] = None
    cpm: Optional[float] = None
    hook_rate: Optional[float] = None
    click_to_lpv: Optional[float] = None
    lpv_to_atc: Optional[float] = None
    atc_to_ic: Optional[float] = None
    ic_to_purchase: Optional[float] = None
    lpv_to_lead: Optional[float] = None
    cvr: Optional[float] = None
    cpa: Optional[float] = None
    roas: Optional[float] = None
    aov: Optional[float] = None
    cpa_cap_status: Optional[str] = None


class PlatformSummary(MetricsSummary):
    platform: str


class CampaignSummary(MetricsSummary):
    campaign: str
    platform: str


class BuyerSummary(MetricsSummary):
    user_id: int
    full_name: str
    rank: int = 0
