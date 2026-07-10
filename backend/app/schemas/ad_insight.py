from datetime import date
from typing import Optional
from pydantic import BaseModel
from app.models.platform_connection import Platform


class AdInsightCreate(BaseModel):
    """Used for manual data seeding (Phase 2) and connector upserts."""
    date: date
    platform: Platform
    campaign: str
    product: str = ""
    creative: str = ""
    funnel_type: str = "Ecom"

    budget: Optional[float] = None
    spend: float = 0
    impressions: int = 0
    reach: Optional[int] = None
    frequency: Optional[float] = None
    link_clicks: int = 0
    three_sec_views: Optional[int] = None
    landing_page_views: Optional[int] = None
    add_to_cart: Optional[int] = None
    initiate_checkout: Optional[int] = None
    purchases: Optional[int] = None
    revenue: Optional[float] = None
    leads: Optional[int] = None
    qualified_leads: Optional[int] = None
    results: Optional[int] = None


class AdInsightRead(AdInsightCreate):
    model_config = {"from_attributes": True}
    id: int
    user_id: int


class DerivedMetrics(BaseModel):
    """Computed KPIs returned alongside raw metrics in API responses."""
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


class InsightWithMetrics(AdInsightRead):
    metrics: DerivedMetrics
