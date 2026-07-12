import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import DB, AdminUser
from app.models.invite_token import InviteToken
from app.schemas.invite import InviteTokenListRead, InviteTokenRead

router = APIRouter(prefix="/invites", tags=["invites"])

INVITE_EXPIRY_DAYS = 7


@router.post("/", response_model=InviteTokenRead, status_code=status.HTTP_201_CREATED)
async def create_invite(admin: AdminUser, db: DB):
    token = secrets.token_urlsafe(32)
    invite = InviteToken(
        token=token,
        created_by_id=admin.id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=INVITE_EXPIRY_DAYS),
    )
    db.add(invite)
    await db.commit()
    await db.refresh(invite)
    return invite


@router.get("/", response_model=list[InviteTokenListRead])
async def list_invites(admin: AdminUser, db: DB):
    result = await db.execute(
        select(InviteToken).order_by(InviteToken.created_at.desc())
    )
    return result.scalars().all()
