from typing import Optional, Literal
from pydantic import BaseModel, Field


class UserBase(BaseModel):
    email: str = Field(..., description="User email address")
    full_name: str
    account_type: Literal["buyer", "seller"] = "buyer"


class UserRegister(UserBase):
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserBase


class UserProfileResponse(UserBase):
    id: str
    created_at: Optional[str] = None
