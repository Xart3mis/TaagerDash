"""
Abstract connector interface and the shared NormalizedInsight schema.

Each platform connector (meta.py, tiktok.py, snapchat.py) implements AdConnector
and maps its API response fields to NormalizedInsight. The ingestion service only
ever calls fetch_insights() — it never knows which platform it's talking to.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Optional

from app.models.platform_connection import Platform


@dataclass
class NormalizedInsight:
    """
    Platform-agnostic insight row.
    Maps 1-to-1 with ad_insights table raw columns.
    All optional fields are None when the platform doesn't report them.
    """
    date: date
    platform: Platform
    campaign: str
    product: str = ""
    creative: str = ""
    funnel_type: str = "Ecom"

    # Budget / spend
    budget: Optional[float] = None
    spend: float = 0.0

    # Reach / delivery
    impressions: int = 0
    reach: Optional[int] = None
    frequency: Optional[float] = None

    # Clicks
    link_clicks: int = 0

    # Video
    three_sec_views: Optional[int] = None

    # Funnel — Ecom
    landing_page_views: Optional[int] = None
    add_to_cart: Optional[int] = None
    initiate_checkout: Optional[int] = None
    purchases: Optional[int] = None
    revenue: Optional[float] = None

    # Funnel — Lead
    leads: Optional[int] = None
    qualified_leads: Optional[int] = None

    # Results: purchases for Ecom, leads for Lead — set by connector
    results: Optional[int] = None


class AdConnector(ABC):
    """
    Abstract base for platform-specific ad connectors.
    Implementations live in meta.py, tiktok.py, snapchat.py.
    """

    platform: Platform  # set on each subclass

    @abstractmethod
    async def fetch_insights(
        self,
        access_token: str,
        account_id: str,
        start_date: date,
        end_date: date,
    ) -> list[NormalizedInsight]:
        """
        Fetch and normalize insights for the given account and date range.
        Must return an empty list (not raise) when there are no results.
        All field normalization and currency conversion to USD happens here.
        """
        ...

    @abstractmethod
    async def refresh_access_token(
        self,
        refresh_token: str,
    ) -> tuple[str, Optional[str], Optional[int]]:
        """
        Exchange a refresh token for a new access token.
        Returns (new_access_token, new_refresh_token_or_None, expires_in_seconds_or_None).
        """
        ...
