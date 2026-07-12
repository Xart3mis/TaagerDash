from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, model_validator


class InviteTokenRead(BaseModel):
    """Full invite token detail — returned only on creation so the admin can copy the token."""
    model_config = {"from_attributes": True}

    id: int
    token: str
    created_by_id: int
    expires_at: datetime
    used_at: Optional[datetime] = None
    used_by_email: Optional[str] = None
    created_at: datetime


class InviteTokenListRead(BaseModel):
    """Invite token summary for list responses — omits the raw token for security."""
    model_config = {"from_attributes": True}

    id: int
    created_by_id: int
    expires_at: datetime
    used_at: Optional[datetime] = None
    used_by_email: Optional[str] = None
    created_at: datetime


class RegisterRequest(BaseModel):
    invite_token: str
    email: EmailStr
    full_name: str
    password: str
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self) -> "RegisterRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self
