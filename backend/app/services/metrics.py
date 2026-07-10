"""
Pure metric derivation functions — no database or I/O dependencies.

Each function takes raw counts/amounts and returns the computed KPI,
or None when the denominator is zero / the required inputs are missing.
These are the single source of truth for every computed metric in the dashboard
(aggregation endpoints, leaderboard, CPA-cap checks all call these).

The formulas are validated against the Excel tracker's known sample values
(see tests/test_metrics.py).
"""

from typing import Optional


def _safe_div(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    """Returns numerator / denominator, or None if denominator is 0 or either value is None."""
    if numerator is None or denominator is None or denominator == 0:
        return None
    return numerator / denominator


# ---------------------------------------------------------------------------
# Ad-level derived metrics (match Daily Entry computed columns I, N–P, R, T, AC–AI, AB, AD, AE, AJ)
# ---------------------------------------------------------------------------

def pacing(spend: Optional[float], budget: Optional[float]) -> Optional[float]:
    """Spend / Budget (column I)."""
    return _safe_div(spend, budget)


def ctr(link_clicks: Optional[int], impressions: Optional[int]) -> Optional[float]:
    """Link Clicks / Impressions (column N)."""
    return _safe_div(link_clicks, impressions)


def cpc(spend: Optional[float], link_clicks: Optional[int]) -> Optional[float]:
    """Spend / Link Clicks (column O)."""
    return _safe_div(spend, link_clicks)


def cpm(spend: Optional[float], impressions: Optional[int]) -> Optional[float]:
    """(Spend / Impressions) × 1000 (column P)."""
    result = _safe_div(spend, impressions)
    return result * 1000 if result is not None else None


def hook_rate(three_sec_views: Optional[int], impressions: Optional[int]) -> Optional[float]:
    """3-Sec Views / Impressions (column R)."""
    return _safe_div(three_sec_views, impressions)


def click_to_lpv(landing_page_views: Optional[int], link_clicks: Optional[int]) -> Optional[float]:
    """Landing Page Views / Link Clicks (column T)."""
    return _safe_div(landing_page_views, link_clicks)


def lpv_to_atc(add_to_cart: Optional[int], landing_page_views: Optional[int]) -> Optional[float]:
    """Add to Cart / Landing Page Views (column AF)."""
    return _safe_div(add_to_cart, landing_page_views)


def atc_to_ic(initiate_checkout: Optional[int], add_to_cart: Optional[int]) -> Optional[float]:
    """Initiate Checkout / Add to Cart (column AG)."""
    return _safe_div(initiate_checkout, add_to_cart)


def ic_to_purchase(purchases: Optional[int], initiate_checkout: Optional[int]) -> Optional[float]:
    """Purchases / Initiate Checkout (column AH)."""
    return _safe_div(purchases, initiate_checkout)


def lpv_to_lead(leads: Optional[int], landing_page_views: Optional[int]) -> Optional[float]:
    """Leads / Landing Page Views (column AI)."""
    return _safe_div(leads, landing_page_views)


def cvr(results: Optional[int], link_clicks: Optional[int]) -> Optional[float]:
    """Results / Link Clicks (column AC). Results = purchases for Ecom, leads for Lead."""
    return _safe_div(results, link_clicks)


def cpa(spend: Optional[float], results: Optional[int]) -> Optional[float]:
    """Spend / Results (column AB)."""
    return _safe_div(spend, results)


def roas(revenue: Optional[float], spend: Optional[float]) -> Optional[float]:
    """Revenue / Spend (column AD)."""
    return _safe_div(revenue, spend)


def aov(revenue: Optional[float], purchases: Optional[int]) -> Optional[float]:
    """Revenue / Purchases — Average Order Value (column AE)."""
    return _safe_div(revenue, purchases)


def cpa_cap_status(cpa_value: Optional[float], cap: Optional[float]) -> Optional[str]:
    """
    Returns 'OK', 'Over Cap', or None (if CPA or cap is unavailable).
    Matches column AJ in Daily Entry.
    """
    if cpa_value is None or cap is None:
        return None
    return "OK" if cpa_value <= cap else "Over Cap"


# ---------------------------------------------------------------------------
# Aggregated (rolled-up) metric helpers
# Used by the aggregation service when summing across rows before deriving KPIs.
# Always aggregate raw counts first, then derive — never average derived ratios.
# ---------------------------------------------------------------------------

def derive_all(
    *,
    spend: float,
    impressions: int,
    link_clicks: int,
    results: Optional[int],
    revenue: Optional[float],
    purchases: Optional[int],
    budget: Optional[float] = None,
    three_sec_views: Optional[int] = None,
    landing_page_views: Optional[int] = None,
    add_to_cart: Optional[int] = None,
    initiate_checkout: Optional[int] = None,
    leads: Optional[int] = None,
    frequency: Optional[float] = None,
    cpa_cap: Optional[float] = None,
) -> dict:
    """
    Derive all computed KPIs from a set of aggregated raw metrics.
    Returns a dict suitable for API responses / leaderboard rows.
    """
    _cpa = cpa(spend, results)
    return {
        "spend": spend,
        "impressions": impressions,
        "link_clicks": link_clicks,
        "results": results,
        "revenue": revenue,
        "frequency": frequency,
        "pacing": pacing(spend, budget),
        "ctr": ctr(link_clicks, impressions),
        "cpc": cpc(spend, link_clicks),
        "cpm": cpm(spend, impressions),
        "hook_rate": hook_rate(three_sec_views, impressions),
        "click_to_lpv": click_to_lpv(landing_page_views, link_clicks),
        "lpv_to_atc": lpv_to_atc(add_to_cart, landing_page_views),
        "atc_to_ic": atc_to_ic(initiate_checkout, add_to_cart),
        "ic_to_purchase": ic_to_purchase(purchases, initiate_checkout),
        "lpv_to_lead": lpv_to_lead(leads, landing_page_views),
        "cvr": cvr(results, link_clicks),
        "cpa": _cpa,
        "roas": roas(revenue, spend),
        "aov": aov(revenue, purchases),
        "cpa_cap_status": cpa_cap_status(_cpa, cpa_cap),
    }


# ---------------------------------------------------------------------------
# Store / order funnel derived metrics
# Mirrors 'Store & LP Funnel' sheet SUMMARY vs TARGET section
# ---------------------------------------------------------------------------

def confirmation_rate(confirmed: Optional[int], placed: Optional[int]) -> Optional[float]:
    """Confirmed Orders / Placed Orders."""
    return _safe_div(confirmed, placed)


def delivery_rate(delivered: Optional[int], confirmed: Optional[int]) -> Optional[float]:
    """Delivered Orders / Confirmed Orders."""
    return _safe_div(delivered, confirmed)


def fulfillment_rate(delivered: Optional[int], placed: Optional[int]) -> Optional[float]:
    """Delivered Orders / Placed Orders."""
    return _safe_div(delivered, placed)


def rto_rate(placed: Optional[int], confirmed: Optional[int]) -> Optional[float]:
    """
    Return-To-Origin rate: (Placed - Confirmed) / Placed.
    Approximates refusals / RTO as orders that were placed but never confirmed.
    """
    if placed is None or confirmed is None or placed == 0:
        return None
    return (placed - confirmed) / placed


def cancellation_rate(cancelled: Optional[int], placed: Optional[int]) -> Optional[float]:
    """Cancelled Orders / Placed Orders."""
    return _safe_div(cancelled, placed)


def avg_basket(basket_value: Optional[float], delivered: Optional[int]) -> Optional[float]:
    """Total basket value / Delivered orders — Average Basket Size."""
    return _safe_div(basket_value, delivered)


def items_per_order(items: Optional[int], placed: Optional[int]) -> Optional[float]:
    """Total items / Placed orders."""
    return _safe_div(items, placed)


def funnel_status(actual: Optional[float], target: Optional[float], higher_is_better: bool = True) -> Optional[str]:
    """
    Returns 'On Track' or 'Below' vs a target threshold.
    Matches the STATUS column logic in the Store & LP Funnel sheet.
    """
    if actual is None or target is None:
        return None
    if higher_is_better:
        return "On Track" if actual >= target else "Below"
    else:
        return "On Track" if actual <= target else "Below"


def derive_funnel_all(
    *,
    placed_orders: int,
    confirmed_orders: Optional[int] = None,
    shipped_orders: Optional[int] = None,
    delivered_orders: Optional[int] = None,
    cancelled_orders: Optional[int] = None,
    basket_value: Optional[float] = None,
    items: Optional[int] = None,
    target_confirmation: Optional[float] = None,
    target_delivery: Optional[float] = None,
    target_fulfillment: Optional[float] = None,
    max_rto: Optional[float] = None,
) -> dict:
    """Derive all funnel KPIs plus vs-target status fields."""
    conf = confirmation_rate(confirmed_orders, placed_orders)
    deliv = delivery_rate(delivered_orders, confirmed_orders)
    fulfill = fulfillment_rate(delivered_orders, placed_orders)
    rto = rto_rate(placed_orders, confirmed_orders)
    cancel = cancellation_rate(cancelled_orders, placed_orders)
    basket = avg_basket(basket_value, delivered_orders)
    ipo = items_per_order(items, placed_orders)

    return {
        "placed_orders": placed_orders,
        "confirmed_orders": confirmed_orders,
        "shipped_orders": shipped_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,
        "confirmation_rate": conf,
        "delivery_rate": deliv,
        "fulfillment_rate": fulfill,
        "rto_rate": rto,
        "cancellation_rate": cancel,
        "avg_basket": basket,
        "items_per_order": ipo,
        "confirmation_status": funnel_status(conf, target_confirmation),
        "delivery_status": funnel_status(deliv, target_delivery),
        "fulfillment_status": funnel_status(fulfill, target_fulfillment),
        "rto_status": funnel_status(rto, max_rto, higher_is_better=False),
    }
