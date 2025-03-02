from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict


class UserBase(BaseModel):
    """Базовая модель пользователя."""
    username: str
    email: EmailStr
    full_name: str
    is_active: bool = True


class UserCreate(UserBase):
    """Модель для создания пользователя."""
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    """Модель для обновления пользователя."""
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None
    password: Optional[str] = None


class UserResponse(UserBase):
    """Модель для ответа с пользователем."""
    id: int
    role: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# Модель для токена
class Token(BaseModel):
    access_token: str
    token_type: str


# Модель с данными внутри токена
class TokenPayload(BaseModel):
    sub: Optional[int] = None 