from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.ad_insight import AdInsight
    from app.models.order_funnel import OrderFunnelEntry
    from app.models.platform_connection import PlatformConnection
    from app.models.target import Target
    from app.models.team import Team


class UserRole(str, enum.Enum):
    buyer = "buyer"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False, default=UserRole.buyer)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    connections: Mapped[list[PlatformConnection]] = relationship(back_populates="user", cascade="all, delete-orphan")
    ad_insights: Mapped[list[AdInsight]] = relationship(back_populates="user", cascade="all, delete-orphan")
    funnel_entries: Mapped[list[OrderFunnelEntry]] = relationship(back_populates="user", cascade="all, delete-orphan")
    targets: Mapped[list[Target]] = relationship(
        back_populates="user",
        primaryjoin="and_(Target.user_id == User.id, Target.scope == 'user')",
        cascade="all, delete-orphan",
        foreign_keys="Target.user_id",
    )
    teams: Mapped[list[Team]] = relationship(
        "Team",
        secondary="user_teams",
        back_populates="members",
    )
