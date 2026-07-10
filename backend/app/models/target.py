from typing import Optional
from sqlalchemy import Float, Integer, ForeignKey, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class TargetScope(str, enum.Enum):
    team = "team"
    user = "user"


class Target(Base):
    """
    Stores performance targets.
    scope='team' rows have user_id=NULL and serve as the shared default.
    scope='user' rows have user_id set and override the team defaults for that buyer.
    Effective value = user override if present, else team default.
    """
    __tablename__ = "targets"
    __table_args__ = (
        UniqueConstraint("scope", "user_id", name="uq_targets_scope_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    scope: Mapped[TargetScope] = mapped_column(SAEnum(TargetScope), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    # Ad performance targets
    target_ctr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)   # e.g. 0.01 = 1%
    target_roas: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # e.g. 2.0
    cpa_cap: Mapped[Optional[float]] = mapped_column(Float, nullable=True)       # max CPA in USD

    # Store / order funnel targets
    target_confirmation: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # e.g. 0.75
    target_delivery: Mapped[Optional[float]] = mapped_column(Float, nullable=True)      # e.g. 0.85
    target_fulfillment: Mapped[Optional[float]] = mapped_column(Float, nullable=True)   # e.g. 0.65
    max_rto: Mapped[Optional[float]] = mapped_column(Float, nullable=True)              # e.g. 0.10

    user: Mapped[Optional["User"]] = relationship(
        back_populates="targets",
        foreign_keys=[user_id],
    )
