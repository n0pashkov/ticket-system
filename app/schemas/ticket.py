from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel


class TicketBase(BaseModel):
    """Базовая модель заявки."""
    title: str
    description: str
    equipment_type: str
    priority: str = "medium"


class TicketCreate(TicketBase):
    """Модель для создания заявки."""
    pass


class TicketUpdate(BaseModel):
    """Модель для обновления заявки."""
    title: Optional[str] = None
    description: Optional[str] = None
    equipment_type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[int] = None


class TicketResponse(TicketBase):
    """Модель для ответа с заявкой."""
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    user_id: int
    assigned_to: Optional[int] = None
    
    class Config:
        orm_mode = True 