from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, select

from app.api.deps import CurrentUser, DB
from app.models.order_funnel import OrderFunnelEntry
from app.models.target import Target, TargetScope
from app.schemas.funnel import FunnelDerivedMetrics, FunnelEntryWithMetrics, OrderFunnelCreate
from app.services.metrics import derive_funnel_all

router = APIRouter(prefix="/funnel", tags=["funnel"])

_METRIC_KEYS = {
    "confirmation_rate", "delivery_rate", "fulfillment_rate", "rto_rate",
    "cancellation_rate", "avg_basket", "items_per_order",
    "confirmation_status", "delivery_status", "fulfillment_status", "rto_status",
}


def _attach_metrics(entry: OrderFunnelEntry, target_conf=None, target_deliv=None, target_fulfill=None, max_rto=None) -> FunnelEntryWithMetrics:
    full = derive_funnel_all(
        placed_orders=entry.placed_orders,
        confirmed_orders=entry.confirmed_orders,
        shipped_orders=entry.shipped_orders,
        delivered_orders=entry.delivered_orders,
        cancelled_orders=entry.cancelled_orders,
        basket_value=entry.basket_value,
        items=entry.items,
        target_confirmation=target_conf,
        target_delivery=target_deliv,
        target_fulfillment=target_fulfill,
        max_rto=max_rto,
    )
    return FunnelEntryWithMetrics(
        id=entry.id,
        user_id=entry.user_id,
        date=entry.date,
        store_or_lp=entry.store_or_lp,
        source=entry.source,
        placed_orders=entry.placed_orders,
        confirmed_orders=entry.confirmed_orders,
        shipped_orders=entry.shipped_orders,
        delivered_orders=entry.delivered_orders,
        cancelled_orders=entry.cancelled_orders,
        basket_value=entry.basket_value,
        items=entry.items,
        metrics=FunnelDerivedMetrics(**{k: v for k, v in full.items() if k in _METRIC_KEYS}),
    )


async def _effective_funnel_targets(db, user_id: int) -> dict:
    """Resolve effective funnel targets (user override → team default)."""
    team_res = await db.execute(
        select(Target).where(Target.scope == TargetScope.team, Target.user_id.is_(None))
    )
    team = team_res.scalar_one_or_none()

    user_res = await db.execute(
        select(Target).where(Target.scope == TargetScope.user, Target.user_id == user_id)
    )
    user = user_res.scalar_one_or_none()

    def _pick(field: str) -> Optional[float]:
        u_val = getattr(user, field, None) if user else None
        t_val = getattr(team, field, None) if team else None
        return u_val if u_val is not None else t_val

    return {
        "target_confirmation": _pick("target_confirmation"),
        "target_delivery": _pick("target_delivery"),
        "target_fulfillment": _pick("target_fulfillment"),
        "max_rto": _pick("max_rto"),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=FunnelEntryWithMetrics, status_code=status.HTTP_201_CREATED)
async def upsert_funnel_entry(body: OrderFunnelCreate, current_user: CurrentUser, db: DB):
    """Create or update a funnel entry (idempotent on date × store_or_lp × source)."""
    stmt = select(OrderFunnelEntry).where(
        OrderFunnelEntry.date == body.date,
        OrderFunnelEntry.user_id == current_user.id,
        OrderFunnelEntry.store_or_lp == body.store_or_lp,
        OrderFunnelEntry.source == body.source,
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    data = body.model_dump()
    if row is None:
        row = OrderFunnelEntry(user_id=current_user.id, **data)
        db.add(row)
    else:
        for k, v in data.items():
            setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    targets = await _effective_funnel_targets(db, current_user.id)
    return _attach_metrics(row, **targets)


@router.get("/", response_model=list[FunnelEntryWithMetrics])
async def list_funnel_entries(
    current_user: CurrentUser,
    db: DB,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    store_or_lp: Optional[str] = Query(None),
):
    """List the current buyer's funnel entries with derived KPIs."""
    where = [OrderFunnelEntry.user_id == current_user.id]
    if start_date:
        where.append(OrderFunnelEntry.date >= start_date)
    if end_date:
        where.append(OrderFunnelEntry.date <= end_date)
    if store_or_lp:
        where.append(OrderFunnelEntry.store_or_lp == store_or_lp)
    stmt = select(OrderFunnelEntry).where(and_(*where)).order_by(OrderFunnelEntry.date.desc())
    result = await db.execute(stmt)
    rows = result.scalars().all()
    targets = await _effective_funnel_targets(db, current_user.id)
    return [_attach_metrics(r, **targets) for r in rows]


@router.put("/{entry_id}", response_model=FunnelEntryWithMetrics)
async def update_funnel_entry(entry_id: int, body: OrderFunnelCreate, current_user: CurrentUser, db: DB):
    result = await db.execute(select(OrderFunnelEntry).where(OrderFunnelEntry.id == entry_id))
    row = result.scalar_one_or_none()
    if row is None or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    targets = await _effective_funnel_targets(db, current_user.id)
    return _attach_metrics(row, **targets)


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_funnel_entry(entry_id: int, current_user: CurrentUser, db: DB):
    result = await db.execute(select(OrderFunnelEntry).where(OrderFunnelEntry.id == entry_id))
    row = result.scalar_one_or_none()
    if row is None or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    await db.delete(row)
    await db.commit()
