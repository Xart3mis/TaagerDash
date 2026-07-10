from datetime import date
from typing import Optional
from sqlalchemy import Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class OrderFunnelEntry(Base):
    """
    Manual daily entry for store / landing-page order funnel data.
    Mirrors the 'Store & LP Funnel' sheet's DAILY ENTRY section.
    Grain: date × user × store_or_lp × source.
    Derived rates (confirmation %, delivery %, fulfillment %, RTO %, etc.)
    are computed at query time, not stored.
    """
    __tablename__ = "order_funnel_entries"
    __table_args__ = (
        UniqueConstraint(
            "date", "user_id", "store_or_lp", "source",
            name="uq_funnel_grain",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Dimensions (mirrors columns B-C of Daily Entry on Store & LP Funnel sheet)
    store_or_lp: Mapped[str] = mapped_column(String(512), nullable=False)   # e.g. "Store - Main"
    source: Mapped[str] = mapped_column(String(64), nullable=False)          # Meta / TikTok / Snapchat / Organic / Other

    # Raw order counts
    placed_orders: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confirmed_orders: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    shipped_orders: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    delivered_orders: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cancelled_orders: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Basket KPIs
    basket_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # total revenue / value
    items: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)          # total items in orders

    user: Mapped["User"] = relationship(back_populates="funnel_entries")
