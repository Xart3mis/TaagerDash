from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DB, AdminUser, CurrentUser
from app.models.target import Target, TargetScope
from app.schemas.target import EffectiveTargets, TargetCreate, TargetRead

router = APIRouter(prefix="/targets", tags=["targets"])


async def _get_team_target(db: AsyncSession) -> Target | None:
    result = await db.execute(
        select(Target).where(Target.scope == TargetScope.team, Target.user_id.is_(None))
    )
    return result.scalar_one_or_none()


async def _get_user_target(db: AsyncSession, user_id: int) -> Target | None:
    result = await db.execute(
        select(Target).where(Target.scope == TargetScope.user, Target.user_id == user_id)
    )
    return result.scalar_one_or_none()


def _merge_targets(team: Target | None, user: Target | None) -> EffectiveTargets:
    """User override wins per field; falls back to team default."""
    fields = [
        "target_ctr", "target_roas", "cpa_cap",
        "target_confirmation", "target_delivery", "target_fulfillment", "max_rto",
    ]
    merged = {}
    for f in fields:
        user_val = getattr(user, f, None) if user else None
        team_val = getattr(team, f, None) if team else None
        merged[f] = user_val if user_val is not None else team_val
    return EffectiveTargets(**merged)


# --- Team targets (admin only) ---

@router.get("/team", response_model=TargetRead)
async def get_team_targets(admin: AdminUser, db: DB):
    t = await _get_team_target(db)
    if t is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team targets not set")
    return t


@router.put("/team", response_model=TargetRead)
async def upsert_team_targets(body: TargetCreate, admin: AdminUser, db: DB):
    t = await _get_team_target(db)
    if t is None:
        t = Target(scope=TargetScope.team, user_id=None)
        db.add(t)

    for field, value in body.model_dump(exclude={"scope"}).items():
        if value is not None:
            setattr(t, field, value)

    await db.commit()
    await db.refresh(t)
    return t


# --- Per-buyer targets ---

@router.get("/me/effective", response_model=EffectiveTargets)
async def get_my_effective_targets(current_user: CurrentUser, db: DB):
    """Returns resolved targets: user override if set, else team default."""
    team = await _get_team_target(db)
    user = await _get_user_target(db, current_user.id)
    return _merge_targets(team, user)


@router.get("/me", response_model=TargetRead | None)
async def get_my_targets(current_user: CurrentUser, db: DB):
    return await _get_user_target(db, current_user.id)


@router.put("/me", response_model=TargetRead)
async def upsert_my_targets(body: TargetCreate, current_user: CurrentUser, db: DB):
    t = await _get_user_target(db, current_user.id)
    if t is None:
        t = Target(scope=TargetScope.user, user_id=current_user.id)
        db.add(t)

    for field, value in body.model_dump(exclude={"scope"}).items():
        if value is not None:
            setattr(t, field, value)

    await db.commit()
    await db.refresh(t)
    return t


# Admin: view any buyer's targets
@router.get("/user/{user_id}/effective", response_model=EffectiveTargets)
async def get_user_effective_targets(user_id: int, admin: AdminUser, db: DB):
    team = await _get_team_target(db)
    user = await _get_user_target(db, user_id)
    return _merge_targets(team, user)
