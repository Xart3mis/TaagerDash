from pydantic import BaseModel


class TeamMemberRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: str
    full_name: str
    role: str


class TeamRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    members: list[TeamMemberRead] = []


class TeamCreate(BaseModel):
    name: str


class TeamMemberAdd(BaseModel):
    user_id: int
