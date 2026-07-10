from datetime import date
from typing import Optional
from sqlalchemy import Date, Float, ForeignKey, Integer, String, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.platform_connection import Platform


class FunnelType(str):
    ecom = "Ecom"
    lead = "Lead"


class AdInsight(Base):
    """
    Core fact table. Grain: date × user × platform × campaign × product × creative × funnel_type.
    Raw metrics from the ad platform APIs — derived KPIs (CTR, CPC, CPM, ROAS, CPA, etc.)
    are computed at query time in services/metrics.py, not stored here.
    Upsert on the grain key keeps ingestion idempotent.
    """
    __tablename__ = "ad_insights"
    __table_args__ = (
        UniqueConstraint(
            "date", "user_id", "platform", "campaign", "product", "creative", "funnel_type",
            name="uq_insight_grain",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    platform: Mapped[Platform] = mapped_column(SAEnum(Platform), nullable=False, index=True)

    # Dimensions (match Daily Entry columns C-F)
    campaign: Mapped[str] = mapped_column(String(512), nullable=False)
    product: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    creative: Mapped[str] = mapped_column(String(512), nullable=False, default="")
    funnel_type: Mapped[str] = mapped_column(String(64), nullable=False, default="Ecom")

    # Raw metrics (columns G-Y, AA from Daily Entry)
    budget: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    spend: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reach: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    frequency: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    link_clicks: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    three_sec_views: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    landing_page_views: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    add_to_cart: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    initiate_checkout: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    purchases: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    revenue: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    leads: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    qualified_leads: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # results = purchases for Ecom, leads for Lead funnel
    results: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    user: Mapped["User"] = relationship(back_populates="ad_insights")
