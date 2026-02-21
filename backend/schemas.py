from pydantic import BaseModel


class UserBase(BaseModel):
    email: str | None = None
    phone_no: str | None = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
