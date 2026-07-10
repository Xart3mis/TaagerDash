from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, String, Enum as SAEnum, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.core.database import Base


class Platform(str, enum.Enum):
    meta = "meta"
    tiktok = "tiktok"
    snapchat = "snapchat"


class PlatformConnection(Base):
    """
    Stores per-buyer OAuth tokens for each ad platform.
    Access and refresh tokens are stored encrypted (Fernet).
    """
    __tablename__ = "platform_connections"
    __table_args__ = (
        UniqueConstraint("user_id", "platform", name="uq_connection_user_platform"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[Platform] = mapped_column(SAEnum(Platform), nullable=False)

    # The ad account ID on the platform (e.g. Meta act_12345, TikTok 7123456789)
    external_account_id: Mapped[str] = mapped_column(String(255), nullable=False)

    # Encrypted OAuth tokens
    encrypted_access_token: Mapped[str] = mapped_column(String(2048), nullable=False)
    encrypted_refresh_token: Mapped[Optional[str]] = mapped_column(String(2048), nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="connections")
