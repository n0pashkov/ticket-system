from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from enum import Enum

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

    model_config = ConfigDict(from_attributes=True)


# Базовая схема для заявки
class TicketBase(BaseModel):
    title: str
    description: str
    priority: str = "medium"
    category_id: Optional[int] = None


# Схема для создания заявки
class TicketCreate(TicketBase):
    pass


# Схема для обновления заявки
class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    category_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    resolution: Optional[str] = None


# Схема для отображения заявки
class Ticket(TicketBase):
    id: int
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    creator_id: int
    assigned_to_id: Optional[int] = None
    resolution: Optional[str] = None
    comments: List[int] = []

    model_config = ConfigDict(from_attributes=True)


# Базовая схема для пользователя
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: str = "user"


# Схема для создания пользователя
class UserCreate(UserBase):
    password: str


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
    is_active: bool
    tickets: Optional[List[Ticket]] = []

    model_config = ConfigDict(from_attributes=True)


# Схема для ответа эндпоинта /me
class UserMe(BaseModel):
    id: int
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# Схема для токена доступа
class Token(BaseModel):
    access_token: str
    token_type: str


# Схема данных в токене
class TokenData(BaseModel):
    username: Optional[str] = None


# Схемы для уведомлений
class NotificationBase(BaseModel):
    title: str
    message: str
    notification_type: str
    related_id: Optional[int] = None  # ID связанного объекта (например, заявки)


class NotificationCreate(NotificationBase):
    user_id: int


class Notification(NotificationBase):
    id: int
    created_at: datetime
    is_read: bool = False
    user_id: int

    model_config = ConfigDict(from_attributes=True)


# Схемы для вложений
class AttachmentBase(BaseModel):
    description: Optional[str] = None


class AttachmentCreate(AttachmentBase):
    ticket_id: int
    filename: str
    file_size: int
    content_type: str


class Attachment(AttachmentBase):
    id: int
    ticket_id: int
    filename: str
    stored_filename: str
    file_path: str
    file_size: int
    content_type: str
    uploaded_by: int
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Схемы для оборудования
class EquipmentBase(BaseModel):
    name: str
    type: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    inventory_number: Optional[str] = None
    location: Optional[str] = None
    status: str = "active"
    purchase_date: Optional[datetime] = None
    warranty_end_date: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    responsible_person: Optional[str] = None
    notes: Optional[str] = None


class EquipmentCreate(EquipmentBase):
    category: Optional[str] = None


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    category: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    inventory_number: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    purchase_date: Optional[datetime] = None
    warranty_end_date: Optional[datetime] = None
    last_maintenance_date: Optional[datetime] = None
    responsible_person: Optional[str] = None
    notes: Optional[str] = None


class Equipment(EquipmentBase):
    id: int
    created_at: datetime
    created_by_id: int
    updated_at: Optional[datetime] = None
    updated_by_id: Optional[int] = None
    
    @property
    def category(self) -> Optional[str]:
        return self.type

    model_config = ConfigDict(from_attributes=True)


# Схемы для технического обслуживания оборудования
class MaintenanceBase(BaseModel):
    equipment_id: Optional[int] = None
    action_type: Optional[str] = None
    description: str
    maintenance_type: Optional[str] = None
    date: Optional[str] = None


class MaintenanceCreate(MaintenanceBase):
    pass


class Maintenance(MaintenanceBase):
    id: int
    performed_by: int
    performed_at: datetime
    
    @property
    def maintenance_type(self) -> Optional[str]:
        return self.action_type

    model_config = ConfigDict(from_attributes=True)


# Схемы для статистики
class TicketStatistics(BaseModel):
    total_tickets: int
    status_distribution: Dict[str, int]
    priority_distribution: Dict[str, int]
    avg_resolution_time_hours: Optional[float] = None


class AgentPerformance(BaseModel):
    agent_id: int
    agent_name: str
    assigned_tickets: int
    resolved_tickets: int
    resolution_rate: float
    avg_resolution_time_hours: Optional[float] = None


class PeriodStatistics(BaseModel):
    period: str
    new_tickets: int
    resolved_tickets: int
    cancelled_tickets: int
    in_progress_tickets: int
    resolution_rate: float


class UserActivity(BaseModel):
    user_id: int
    username: str
    full_name: Optional[str] = None
    ticket_count: Optional[int] = None
    comment_count: Optional[int] = None


# Схемы для категорий заявок
class TicketCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class TicketCategoryCreate(TicketCategoryBase):
    pass


class TicketCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class TicketCategory(TicketCategoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True) 