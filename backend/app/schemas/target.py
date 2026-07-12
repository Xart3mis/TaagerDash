from typing import Optional

from pydantic import BaseModel

from app.models.target import TargetScope


class TargetBase(BaseModel):
    target_ctr: Optional[float] = None
    target_roas: Optional[float] = None
    cpa_cap: Optional[float] = None
    target_confirmation: Optional[float] = None
    target_delivery: Optional[float] = None
    target_fulfillment: Optional[float] = None
    max_rto: Optional[float] = None


class TargetCreate(TargetBase):
    scope: TargetScope = TargetScope.user


class TargetRead(TargetBase):
    model_config = {"from_attributes": True}

    id: int
    scope: TargetScope
    user_id: Optional[int]


class EffectiveTargets(TargetBase):
    """Resolved targets for a buyer: user override if set, else team default."""
    pass
