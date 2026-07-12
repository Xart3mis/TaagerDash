from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DB, AdminUser, CurrentUser
from app.models.team import Team
from app.models.user import User
from app.schemas.team import TeamCreate, TeamMemberAdd, TeamRead

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/", response_model=list[TeamRead])
async def list_teams(current_user: CurrentUser, db: DB):
    """List teams. Admins see all; buyers see only their teams."""
    if current_user.role.value == "admin":
        result = await db.execute(
            select(Team).options(selectinload(Team.members)).order_by(Team.name)
        )
    else:
        result = await db.execute(
            select(Team)
            .options(selectinload(Team.members))
            .where(Team.members.any(User.id == current_user.id))
            .order_by(Team.name)
        )
    return result.scalars().all()


@router.post("/", response_model=TeamRead, status_code=status.HTTP_201_CREATED)
async def create_team(body: TeamCreate, admin: AdminUser, db: DB):
    existing = await db.execute(select(Team).where(Team.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Team name already in use")
    team = Team(name=body.name)
    db.add(team)
    await db.commit()
    result = await db.execute(
        select(Team).options(selectinload(Team.members)).where(Team.id == team.id)
    )
    return result.scalar_one()


@router.put("/{team_id}", response_model=TeamRead)
async def update_team(team_id: int, body: TeamCreate, admin: AdminUser, db: DB):
    result = await db.execute(
        select(Team).options(selectinload(Team.members)).where(Team.id == team_id)
    )
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    team.name = body.name
    await db.commit()
    result = await db.execute(
        select(Team).options(selectinload(Team.members)).where(Team.id == team_id)
    )
    return result.scalar_one()


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(team_id: int, admin: AdminUser, db: DB):
    result = await db.execute(select(Team).where(Team.id == team_id))
    team = result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    await db.delete(team)
    await db.commit()


@router.post("/{team_id}/members", response_model=TeamRead)
async def add_member(team_id: int, body: TeamMemberAdd, admin: AdminUser, db: DB):
    team_res = await db.execute(
        select(Team).options(selectinload(Team.members)).where(Team.id == team_id)
    )
    team = team_res.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    user_res = await db.execute(select(User).where(User.id == body.user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user not in team.members:
        team.members.append(user)
        await db.commit()
    result = await db.execute(
        select(Team).options(selectinload(Team.members)).where(Team.id == team_id)
    )
    return result.scalar_one()


@router.delete("/{team_id}/members/{user_id}", response_model=TeamRead)
async def remove_member(team_id: int, user_id: int, admin: AdminUser, db: DB):
    team_res = await db.execute(
        select(Team).options(selectinload(Team.members)).where(Team.id == team_id)
    )
    team = team_res.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    team.members = [m for m in team.members if m.id != user_id]
    await db.commit()
    result = await db.execute(
        select(Team).options(selectinload(Team.members)).where(Team.id == team_id)
    )
    return result.scalar_one()
