from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr

from app.models.models import UserRole, TicketStatus


# Базовая схема для комментария
class CommentBase(BaseModel):
    text: str


# Схема для создания комментария
class CommentCreate(CommentBase):
    pass


# Схема для отображения комментария
class Comment(CommentBase):
    id: int
    author_id: int
    ticket_id: int
    created_at: datetime

    class Config:
        orm_mode = True


# Базовая схема для заявки
class TicketBase(BaseModel):
    title: str
    description: str
    priority: int = 1


# Схема для создания заявки
class TicketCreate(TicketBase):
    pass


# Схема для обновления заявки
class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[int] = None
    assigned_to_id: Optional[int] = None


# Схема для отображения заявки
class Ticket(TicketBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    creator_id: int
    assigned_to_id: Optional[int] = None
    comments: List[Comment] = []

    class Config:
        orm_mode = True


# Базовая схема для пользователя
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None


# Схема для создания пользователя
class UserCreate(UserBase):
    password: str
    role: str = UserRole.USER


# Схема для обновления пользователя
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# Схема для отображения пользователя
class User(UserBase):
    id: int
    role: str
    is_active: bool
    tickets: List[Ticket] = []

    class Config:
        orm_mode = True


# Схема для токена доступа
class Token(BaseModel):
    access_token: str
    token_type: str


# Схема данных в токене
class TokenData(BaseModel):
    username: Optional[str] = None 