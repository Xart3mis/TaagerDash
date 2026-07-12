"""
Unit tests for services/metrics.py.

Fixtures are taken directly from the Excel tracker's sample data rows and
Dashboard tab computed values, so these tests prove the derivation logic
matches what the team already uses.

Sample rows (Daily Entry, rows 2-4):
  Row 2 — Meta / Summer Sale - Prospecting / Wireless Earbuds / Ecom
  Row 3 — TikTok / Summer Sale - Retargeting / Wireless Earbuds / Ecom
  Row 4 — Snapchat / Lead Magnet - Cold / Free Consultation / Lead

Dashboard totals (rows 7, 11-13, 18-20) are also tested for the aggregated path.
"""

from app.services.metrics import (
    aov,
    atc_to_ic,
    avg_basket,
    cancellation_rate,
    click_to_lpv,
    confirmation_rate,
    cpa,
    cpa_cap_status,
    cpc,
    cpm,
    ctr,
    cvr,
    delivery_rate,
    derive_all,
    derive_funnel_all,
    fulfillment_rate,
    funnel_status,
    hook_rate,
    ic_to_purchase,
    lpv_to_atc,
    lpv_to_lead,
    pacing,
    roas,
    rto_rate,
)

EPSILON = 1e-9  # float comparison tolerance


# ---------------------------------------------------------------------------
# Row 2 — Meta (Ecom)
# ---------------------------------------------------------------------------
class TestMetaEcomRow:
    spend = 480
    budget = 500
    impressions = 240_000
    link_clicks = 4_200
    three_sec_views = 52_000
    landing_page_views = 3_100
    add_to_cart = 410
    initiate_checkout = 180
    purchases = 96
    revenue = 14_400
    results = 96
    cpa_cap = 5.0

    def test_pacing(self):
        assert abs(pacing(self.spend, self.budget) - 0.96) < EPSILON

    def test_ctr(self):
        expected = 4200 / 240_000
        assert abs(ctr(self.link_clicks, self.impressions) - expected) < EPSILON

    def test_cpc(self):
        expected = 480 / 4200
        assert abs(cpc(self.spend, self.link_clicks) - expected) < EPSILON

    def test_cpm(self):
        expected = (480 / 240_000) * 1000
        assert abs(cpm(self.spend, self.impressions) - expected) < EPSILON

    def test_hook_rate(self):
        expected = 52_000 / 240_000
        assert abs(hook_rate(self.three_sec_views, self.impressions) - expected) < EPSILON

    def test_click_to_lpv(self):
        expected = 3_100 / 4_200
        assert abs(click_to_lpv(self.landing_page_views, self.link_clicks) - expected) < EPSILON

    def test_lpv_to_atc(self):
        expected = 410 / 3_100
        assert abs(lpv_to_atc(self.add_to_cart, self.landing_page_views) - expected) < EPSILON

    def test_atc_to_ic(self):
        expected = 180 / 410
        assert abs(atc_to_ic(self.initiate_checkout, self.add_to_cart) - expected) < EPSILON

    def test_ic_to_purchase(self):
        expected = 96 / 180
        assert abs(ic_to_purchase(self.purchases, self.initiate_checkout) - expected) < EPSILON

    def test_cvr(self):
        expected = 96 / 4_200
        assert abs(cvr(self.results, self.link_clicks) - expected) < EPSILON

    def test_cpa(self):
        assert abs(cpa(self.spend, self.results) - 5.0) < EPSILON

    def test_roas(self):
        assert abs(roas(self.revenue, self.spend) - 30.0) < EPSILON

    def test_aov(self):
        expected = 14_400 / 96
        assert abs(aov(self.revenue, self.purchases) - expected) < EPSILON

    def test_cpa_cap_status_ok(self):
        assert cpa_cap_status(5.0, 5.0) == "OK"

    def test_cpa_cap_status_over(self):
        assert cpa_cap_status(5.01, 5.0) == "Over Cap"


# ---------------------------------------------------------------------------
# Row 3 — TikTok (Ecom)
# ---------------------------------------------------------------------------
class TestTikTokEcomRow:
    spend = 315
    budget = 300
    impressions = 90_000
    link_clicks = 2_600
    three_sec_views = 38_000
    landing_page_views = 2_200
    add_to_cart = 520
    initiate_checkout = 300
    purchases = 150
    revenue = 24_000
    results = 150

    def test_pacing(self):
        assert abs(pacing(self.spend, self.budget) - 1.05) < EPSILON

    def test_hook_rate(self):
        expected = 38_000 / 90_000
        assert abs(hook_rate(self.three_sec_views, self.impressions) - expected) < EPSILON

    def test_roas(self):
        # 24000 / 315 ≈ 76.19
        expected = 24_000 / 315
        assert abs(roas(self.revenue, self.spend) - expected) < EPSILON

    def test_cpa(self):
        expected = 315 / 150
        assert abs(cpa(self.spend, self.results) - expected) < EPSILON


# ---------------------------------------------------------------------------
# Row 4 — Snapchat (Lead funnel — no revenue/purchases, results = leads)
# ---------------------------------------------------------------------------
class TestSnapchatLeadRow:
    spend = 240
    budget = 250
    impressions = 150_000
    link_clicks = 1_800
    three_sec_views = 21_000
    landing_page_views = 1_500
    leads = 320
    results = 320
    revenue = None
    purchases = None

    def test_pacing(self):
        assert abs(pacing(self.spend, self.budget) - 0.96) < EPSILON

    def test_cpa_lead(self):
        expected = 240 / 320
        assert abs(cpa(self.spend, self.results) - expected) < EPSILON

    def test_roas_none_when_no_revenue(self):
        assert roas(self.revenue, self.spend) is None

    def test_aov_none_when_no_purchases(self):
        assert aov(self.revenue, self.purchases) is None

    def test_lpv_to_lead(self):
        expected = 320 / 1_500
        assert abs(lpv_to_lead(self.leads, self.landing_page_views) - expected) < EPSILON


# ---------------------------------------------------------------------------
# Dashboard rollup — All Campaigns total (row 7)
# spend=1035, impressions=480000, clicks=8600, results=566, revenue=38400
# CTR=8600/480000, CPC=1035/8600, CPM=1035/480000*1000
# CVR=566/8600, CPA=1035/566, ROAS=38400/1035
# ---------------------------------------------------------------------------
class TestDashboardRollup:
    def test_ctr_total(self):
        expected = 8_600 / 480_000
        assert abs(ctr(8_600, 480_000) - expected) < EPSILON

    def test_cpc_total(self):
        expected = 1_035 / 8_600
        assert abs(cpc(1_035, 8_600) - expected) < EPSILON

    def test_cpm_total(self):
        expected = (1_035 / 480_000) * 1_000
        assert abs(cpm(1_035, 480_000) - expected) < EPSILON

    def test_cvr_total(self):
        expected = 566 / 8_600
        assert abs(cvr(566, 8_600) - expected) < EPSILON

    def test_cpa_total(self):
        expected = 1_035 / 566
        assert abs(cpa(1_035, 566) - expected) < EPSILON

    def test_roas_total(self):
        expected = 38_400 / 1_035
        assert abs(roas(38_400, 1_035) - expected) < EPSILON

    def test_derive_all_keys(self):
        result = derive_all(
            spend=1_035,
            impressions=480_000,
            link_clicks=8_600,
            results=566,
            revenue=38_400,
            purchases=246,
            cpa_cap=5.0,
        )
        expected_keys = {
            "spend", "impressions", "link_clicks", "results", "revenue", "frequency",
            "pacing", "ctr", "cpc", "cpm", "hook_rate", "click_to_lpv",
            "lpv_to_atc", "atc_to_ic", "ic_to_purchase", "lpv_to_lead",
            "cvr", "cpa", "roas", "aov", "cpa_cap_status",
        }
        assert expected_keys == set(result.keys())

    def test_derive_all_cpa_cap_status_over(self):
        result = derive_all(
            spend=1_035,
            impressions=480_000,
            link_clicks=8_600,
            results=566,
            revenue=38_400,
            purchases=246,
            cpa_cap=1.0,  # cap at $1 — CPA ~$1.83, so Over Cap
        )
        assert result["cpa_cap_status"] == "Over Cap"


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------
class TestEdgeCases:
    def test_zero_impressions_returns_none(self):
        assert ctr(100, 0) is None
        assert cpm(100, 0) is None
        assert hook_rate(1000, 0) is None

    def test_zero_spend_cpc_none(self):
        # No results from zero spend — CPA undefined
        assert cpa(0, 0) is None

    def test_none_inputs(self):
        assert ctr(None, 1000) is None
        assert roas(None, 100) is None
        assert cpa(100, None) is None


# ---------------------------------------------------------------------------
# Store / funnel metrics — from the Excel Store & LP Funnel sample
# placed=445, confirmed=248, delivered=222, cancelled≈57 (14.28% of 445≈63.6 → use confirmed for RTO)
# confirmation=248/445≈0.5573, delivery=222/248≈0.8952, fulfillment=222/445≈0.4989
# ---------------------------------------------------------------------------
class TestFunnelMetrics:
    placed = 445
    confirmed = 248
    delivered = 222
    cancelled = 57  # approximated from 14.28% × 445

    def test_confirmation_rate(self):
        expected = 248 / 445
        assert abs(confirmation_rate(self.confirmed, self.placed) - expected) < EPSILON

    def test_delivery_rate(self):
        expected = 222 / 248
        assert abs(delivery_rate(self.delivered, self.confirmed) - expected) < EPSILON

    def test_fulfillment_rate(self):
        expected = 222 / 445
        assert abs(fulfillment_rate(self.delivered, self.placed) - expected) < EPSILON

    def test_rto_rate(self):
        # (445 - 248) / 445 = 197 / 445 ≈ 0.4427
        expected = (445 - 248) / 445
        assert abs(rto_rate(self.placed, self.confirmed) - expected) < EPSILON

    def test_cancellation_rate(self):
        expected = 57 / 445
        assert abs(cancellation_rate(self.cancelled, self.placed) - expected) < EPSILON

    def test_avg_basket(self):
        # basket_value=342.34*delivered, delivered=222
        total_basket = 342.342342342342 * 222
        assert abs(avg_basket(total_basket, self.delivered) - 342.342342342342) < 0.0001

    def test_funnel_status_on_track(self):
        # delivery 0.895 vs target 0.85 — on track
        assert funnel_status(0.895, 0.85) == "On Track"

    def test_funnel_status_below(self):
        # confirmation 0.557 vs target 0.75 — below
        assert funnel_status(0.557, 0.75) == "Below"

    def test_funnel_status_lower_is_better(self):
        # rto 0.067 vs max 0.10 — on track (lower is better)
        assert funnel_status(0.067, 0.10, higher_is_better=False) == "On Track"

    def test_derive_funnel_all_keys(self):
        result = derive_funnel_all(
            placed_orders=445,
            confirmed_orders=248,
            delivered_orders=222,
            cancelled_orders=57,
            basket_value=76_000.0,
            items=494,
            target_confirmation=0.75,
            target_delivery=0.85,
            target_fulfillment=0.65,
            max_rto=0.10,
        )
        expected_keys = {
            "placed_orders", "confirmed_orders", "shipped_orders", "delivered_orders",
            "cancelled_orders", "confirmation_rate", "delivery_rate", "fulfillment_rate",
            "rto_rate", "cancellation_rate", "avg_basket", "items_per_order",
            "confirmation_status", "delivery_status", "fulfillment_status", "rto_status",
        }
        assert expected_keys == set(result.keys())

    def test_derive_funnel_statuses(self):
        result = derive_funnel_all(
            placed_orders=445,
            confirmed_orders=248,
            delivered_orders=222,
            target_confirmation=0.75,  # actual 0.557 → Below
            target_delivery=0.85,      # actual 0.895 → On Track
            target_fulfillment=0.65,   # actual 0.499 → Below
            max_rto=0.10,              # actual 0.443 → Below (over cap)
        )
        assert result["confirmation_status"] == "Below"
        assert result["delivery_status"] == "On Track"
        assert result["fulfillment_status"] == "Below"
        assert result["rto_status"] == "Below"
