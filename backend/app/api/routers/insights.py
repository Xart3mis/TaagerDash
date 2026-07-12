from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DB, AdminUser, CurrentUser
from app.models.ad_insight import AdInsight
from app.models.platform_connection import Platform
from app.models.target import Target, TargetScope
from app.models.user import User
from app.schemas.ad_insight import AdInsightCreate, AdInsightRead
from app.schemas.insights import (
    BuyerSummary,
    CampaignSummary,
    DailyMetrics,
    MetricsSummary,
    PlatformSummary,
)
from app.services.metrics import derive_all

router = APIRouter(prefix="/insights", tags=["insights"])


# ---------------------------------------------------------------------------
# Aggregation helpers
# ---------------------------------------------------------------------------

_AGG_COLS = [
    func.coalesce(func.sum(AdInsight.spend), 0.0).label("spend"),
    func.coalesce(func.sum(AdInsight.impressions), 0).label("impressions"),
    func.coalesce(func.sum(AdInsight.link_clicks), 0).label("link_clicks"),
    func.sum(AdInsight.results).label("results"),
    func.sum(AdInsight.revenue).label("revenue"),
    func.sum(AdInsight.purchases).label("purchases"),
    func.sum(AdInsight.budget).label("budget"),
    func.sum(AdInsight.three_sec_views).label("three_sec_views"),
    func.sum(AdInsight.landing_page_views).label("landing_page_views"),
    func.sum(AdInsight.add_to_cart).label("add_to_cart"),
    func.sum(AdInsight.initiate_checkout).label("initiate_checkout"),
    func.sum(AdInsight.leads).label("leads"),
]


async def _agg(db: AsyncSession, where: list, group_cols: list = []):
    stmt = select(*group_cols, *_AGG_COLS).where(and_(*where))
    if group_cols:
        stmt = stmt.group_by(*group_cols)
    result = await db.execute(stmt)
    return result.mappings().all()


def _to_derived(r, cpa_cap: Optional[float] = None) -> dict:
    return derive_all(
        spend=r["spend"] or 0,
        impressions=r["impressions"] or 0,
        link_clicks=r["link_clicks"] or 0,
        results=r["results"],
        revenue=r["revenue"],
        purchases=r["purchases"],
        budget=r["budget"],
        three_sec_views=r["three_sec_views"],
        landing_page_views=r["landing_page_views"],
        add_to_cart=r["add_to_cart"],
        initiate_checkout=r["initiate_checkout"],
        leads=r["leads"],
        cpa_cap=cpa_cap,
    )


def _date_where(start_date: date, end_date: date, platform: Optional[Platform]) -> list:
    w: list = [AdInsight.date >= start_date, AdInsight.date <= end_date]
    if platform:
        w.append(AdInsight.platform == platform)
    return w


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.post("/", response_model=AdInsightRead, status_code=status.HTTP_201_CREATED)
async def upsert_insight(body: AdInsightCreate, current_user: CurrentUser, db: DB):
    """Create or update an ad insight row (idempotent on grain key)."""
    stmt = select(AdInsight).where(
        AdInsight.date == body.date,
        AdInsight.user_id == current_user.id,
        AdInsight.platform == body.platform,
        AdInsight.campaign == body.campaign,
        AdInsight.product == body.product,
        AdInsight.creative == body.creative,
        AdInsight.funnel_type == body.funnel_type,
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    data = body.model_dump()
    if row is None:
        row = AdInsight(user_id=current_user.id, **data)
        db.add(row)
    else:
        for k, v in data.items():
            setattr(row, k, v)
    await db.commit()
    await db.refresh(row)
    return row


@router.get("/", response_model=list[AdInsightRead])
async def list_insights(
    current_user: CurrentUser,
    db: DB,
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    platform: Optional[Platform] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=500),
):
    """List the current buyer's raw insight rows."""
    where: list = [AdInsight.user_id == current_user.id]
    if start_date:
        where.append(AdInsight.date >= start_date)
    if end_date:
        where.append(AdInsight.date <= end_date)
    if platform:
        where.append(AdInsight.platform == platform)
    stmt = (
        select(AdInsight)
        .where(and_(*where))
        .order_by(AdInsight.date.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.delete("/{insight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_insight(insight_id: int, current_user: CurrentUser, db: DB):
    result = await db.execute(select(AdInsight).where(AdInsight.id == insight_id))
    row = result.scalar_one_or_none()
    if row is None or row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    await db.delete(row)
    await db.commit()


# ---------------------------------------------------------------------------
# Aggregation endpoints
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=MetricsSummary)
async def get_summary(
    current_user: CurrentUser,
    db: DB,
    start_date: date = Query(...),
    end_date: date = Query(...),
    platform: Optional[Platform] = Query(None),
):
    """Rolled-up metrics for the current buyer over a date range."""
    where = [AdInsight.user_id == current_user.id] + _date_where(start_date, end_date, platform)
    rows = await _agg(db, where)
    if not rows:
        return MetricsSummary()
    return MetricsSummary(**_to_derived(rows[0]))


@router.get("/by-platform", response_model=list[PlatformSummary])
async def get_by_platform(
    current_user: CurrentUser,
    db: DB,
    start_date: date = Query(...),
    end_date: date = Query(...),
):
    """Metrics broken down by ad platform for the current buyer."""
    where = [AdInsight.user_id == current_user.id, AdInsight.date >= start_date, AdInsight.date <= end_date]
    rows = await _agg(db, where, group_cols=[AdInsight.platform])
    return [PlatformSummary(platform=r["platform"], **_to_derived(r)) for r in rows]


@router.get("/by-campaign", response_model=list[CampaignSummary])
async def get_by_campaign(
    current_user: CurrentUser,
    db: DB,
    start_date: date = Query(...),
    end_date: date = Query(...),
    platform: Optional[Platform] = Query(None),
):
    """Metrics broken down by campaign × platform for the current buyer."""
    where = [AdInsight.user_id == current_user.id] + _date_where(start_date, end_date, platform)
    rows = await _agg(db, where, group_cols=[AdInsight.campaign, AdInsight.platform])
    return [
        CampaignSummary(campaign=r["campaign"], platform=r["platform"], **_to_derived(r))
        for r in rows
    ]


@router.get("/by-day", response_model=list[DailyMetrics])
async def get_by_day(
    current_user: CurrentUser,
    db: DB,
    start_date: date = Query(...),
    end_date: date = Query(...),
    platform: Optional[Platform] = Query(None),
):
    """Daily spend/revenue/purchases for the current buyer — powers trend charts."""
    where = [AdInsight.user_id == current_user.id] + _date_where(start_date, end_date, platform)
    rows = await _agg(db, where, group_cols=[AdInsight.date])
    sorted_rows = sorted(rows, key=lambda x: x["date"])
    return [
        DailyMetrics(
            date=str(r["date"]),
            spend=r["spend"] or 0,
            revenue=r["revenue"],
            purchases=r["purchases"],
            impressions=r["impressions"] or 0,
            link_clicks=r["link_clicks"] or 0,
        )
        for r in sorted_rows
    ]


@router.get("/leaderboard", response_model=list[BuyerSummary])
async def get_leaderboard(
    _admin: AdminUser,
    db: DB,
    start_date: date = Query(...),
    end_date: date = Query(...),
    platform: Optional[Platform] = Query(None),
    sort_by: str = Query("spend", pattern="^(spend|roas|cpa|cvr)$"),
):
    """Team leaderboard: all buyers ranked by the chosen KPI (admin only)."""
    where = _date_where(start_date, end_date, platform)
    rows = await _agg(db, where, group_cols=[AdInsight.user_id])
    if not rows:
        return []

    user_ids = [r["user_id"] for r in rows]

    # Fetch buyer display names
    users_res = await db.execute(select(User).where(User.id.in_(user_ids)))
    users = {u.id: u for u in users_res.scalars().all()}

    # Team CPA cap (baseline)
    team_res = await db.execute(
        select(Target).where(Target.scope == TargetScope.team, Target.user_id.is_(None))
    )
    team_target = team_res.scalar_one_or_none()
    team_cap: Optional[float] = team_target.cpa_cap if team_target else None

    # Per-user CPA cap overrides
    user_targets_res = await db.execute(
        select(Target).where(Target.scope == TargetScope.user, Target.user_id.in_(user_ids))
    )
    user_caps: dict[int, Optional[float]] = {
        t.user_id: t.cpa_cap for t in user_targets_res.scalars().all() if t.user_id is not None
    }

    summaries: list[BuyerSummary] = []
    for r in rows:
        uid = r["user_id"]
        user = users.get(uid)
        if not user:
            continue
        effective_cap = user_caps.get(uid) or team_cap
        derived = _to_derived(r, cpa_cap=effective_cap)
        summaries.append(BuyerSummary(user_id=uid, full_name=user.full_name, **derived))

    sort_fns = {
        "spend": lambda s: -(s.spend or 0),
        "roas":  lambda s: -(s.roas or 0),
        "cpa":   lambda s: (s.cpa if s.cpa is not None else float("inf")),
        "cvr":   lambda s: -(s.cvr or 0),
    }
    summaries.sort(key=sort_fns.get(sort_by, sort_fns["spend"]))
    for i, s in enumerate(summaries):
        s.rank = i + 1

    return summaries
