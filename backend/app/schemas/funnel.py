from datetime import date
from typing import Optional

from pydantic import BaseModel


class OrderFunnelCreate(BaseModel):
    date: date
    store_or_lp: str
    source: str

    placed_orders: int
    confirmed_orders: Optional[int] = None
    shipped_orders: Optional[int] = None
    delivered_orders: Optional[int] = None
    cancelled_orders: Optional[int] = None
    basket_value: Optional[float] = None
    items: Optional[int] = None


class OrderFunnelRead(OrderFunnelCreate):
    model_config = {"from_attributes": True}
    id: int
    user_id: int


class FunnelDerivedMetrics(BaseModel):
    confirmation_rate: Optional[float] = None
    delivery_rate: Optional[float] = None
    fulfillment_rate: Optional[float] = None
    rto_rate: Optional[float] = None
    cancellation_rate: Optional[float] = None
    avg_basket: Optional[float] = None
    items_per_order: Optional[float] = None
    confirmation_status: Optional[str] = None
    delivery_status: Optional[str] = None
    fulfillment_status: Optional[str] = None
    rto_status: Optional[str] = None


class FunnelEntryWithMetrics(OrderFunnelRead):
    metrics: FunnelDerivedMetrics
