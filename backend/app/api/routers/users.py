from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, AdminUser, DB
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserUpdate, UserRead,
    ProfileUpdateRequest, ChangePasswordRequest, ChangeEmailRequest,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
async def get_me(current_user: CurrentUser):
    return current_user


@router.put("/me/profile", response_model=UserRead)
async def update_profile(body: ProfileUpdateRequest, current_user: CurrentUser, db: DB):
    """Update the current user's display name."""
    current_user.full_name = body.full_name
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(body: ChangePasswordRequest, current_user: CurrentUser, db: DB):
    """Change password — requires the current password for verification."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()


@router.put("/me/email", response_model=UserRead)
async def change_email(body: ChangeEmailRequest, current_user: CurrentUser, db: DB):
    """Change email — requires the current password for verification."""
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password is incorrect")
    existing = await db.execute(select(User).where(User.email == body.new_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
    current_user.email = str(body.new_email)
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/me", response_model=UserRead)
async def update_me(body: UserUpdate, current_user: CurrentUser, db: DB):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.password is not None:
        current_user.hashed_password = hash_password(body.password)
    await db.commit()
    await db.refresh(current_user)
    return current_user


# Admin-only routes

@router.get("/", response_model=list[UserRead])
async def list_users(admin: AdminUser, db: DB):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(body: UserCreate, admin: AdminUser, db: DB):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserRead)
async def update_user(user_id: int, body: UserUpdate, admin: AdminUser, db: DB):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.password is not None:
        user.hashed_password = hash_password(body.password)
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return user
