from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class CommentBase(BaseModel):
    """Базовая модель комментария."""
    text: str


class CommentCreate(CommentBase):
    """Модель для создания комментария."""
    pass


class CommentResponse(CommentBase):
    """Модель для ответа с комментарием."""
    id: int
    ticket_id: int
    author_id: int
    created_at: datetime
    
    class Config:
        orm_mode = True 