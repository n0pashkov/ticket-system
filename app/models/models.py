from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.database import Base


# Определение ролей пользователей
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    AGENT = "agent"
    USER = "user"


# Определение статусов заявок
class TicketStatus(str, enum.Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# Определение типов уведомлений
class NotificationType(str, enum.Enum):
    TICKET_CREATED = "ticket_created"
    TICKET_UPDATED = "ticket_updated"
    TICKET_ASSIGNED = "ticket_assigned"
    TICKET_COMPLETED = "ticket_completed"
    COMMENT_ADDED = "comment_added"
    SYSTEM = "system"


# Определение типов действий для обслуживания оборудования
class MaintenanceActionType(str, enum.Enum):
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    INSPECTION = "inspection"
    UPGRADE = "upgrade"
    OTHER = "other"


# Определение статусов оборудования
class EquipmentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    REPAIR = "repair"
    DECOMMISSIONED = "decommissioned"


# Модель пользователя
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String, default=UserRole.USER)
    is_active = Column(Boolean, default=True)
    
    # Связь с заявками (пользователь может создать много заявок)
    tickets = relationship("Ticket", foreign_keys="Ticket.creator_id", back_populates="creator")
    
    # Связь с заявками агента (агент может обрабатывать много заявок)
    assigned_tickets = relationship("Ticket", 
                                 foreign_keys="Ticket.assigned_to_id", 
                                 back_populates="assigned_to")
    
    # Связь с комментариями
    comments = relationship("Comment", back_populates="author")
    
    # Связь с уведомлениями
    notifications = relationship("Notification", back_populates="user")
    
    # Связь с вложениями
    attachments = relationship("Attachment", back_populates="uploaded_by_user")
    
    # Связь с оборудованием (созданным пользователем)
    created_equipment = relationship("Equipment", 
                                  foreign_keys="Equipment.created_by_id", 
                                  back_populates="created_by")
    
    # Связь с оборудованием (обновленным пользователем)
    updated_equipment = relationship("Equipment", 
                                  foreign_keys="Equipment.updated_by_id", 
                                  back_populates="updated_by")
    
    # Связь с записями о техническом обслуживании
    maintenance_records = relationship("Maintenance", back_populates="performed_by_user")


# Импортируем Ticket из отдельного модуля
from app.models.ticket import Ticket


# Модель категории заявок
class TicketCategory(Base):
    __tablename__ = "ticket_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связь с заявками
    tickets = relationship("Ticket", back_populates="category")
    
    def __repr__(self):
        return f"<TicketCategory(id={self.id}, name='{self.name}')>"


# Модель заявки
class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    status = Column(String, default=TicketStatus.NEW)
    priority = Column(String, default="medium")  # low, medium, high
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Внешний ключ на создателя
    creator_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User", foreign_keys=[creator_id], back_populates="tickets")
    
    # Внешний ключ на исполнителя (агента)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tickets")
    
    # Внешний ключ на категорию
    category_id = Column(Integer, ForeignKey("ticket_categories.id"), nullable=True)
    category = relationship("TicketCategory", back_populates="tickets")
    
    # Связь с комментариями
    comments = relationship("Comment", back_populates="ticket", cascade="all, delete-orphan")
    
    # Связь с вложениями
    attachments = relationship("Attachment", back_populates="ticket", cascade="all, delete-orphan")
    
    # Связь с оборудованием - временно отключена, так как столбца нет в базе данных
    # equipment_id = Column(Integer, ForeignKey("equipment.id"), nullable=True)
    # equipment = relationship("Equipment", back_populates="tickets")

    def __repr__(self):
        return f"<Ticket(id={self.id}, title='{self.title}', status='{self.status}', priority='{self.priority}')>"


# Модель комментария
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Внешний ключ на автора
    author_id = Column(Integer, ForeignKey("users.id"))
    author = relationship("User", back_populates="comments")
    
    # Внешний ключ на заявку
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    ticket = relationship("Ticket", back_populates="comments")


# Модель уведомления
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    message = Column(Text)
    notification_type = Column(String)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    related_id = Column(Integer, nullable=True)  # ID связанного объекта (например, заявки)
    
    # Внешний ключ на пользователя
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="notifications")


# Модель вложения
class Attachment(Base):
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)  # Оригинальное имя файла
    stored_filename = Column(String)  # Имя файла в хранилище
    file_path = Column(String)  # Путь к файлу
    file_size = Column(Integer)  # Размер файла в байтах
    content_type = Column(String)  # MIME-тип файла
    description = Column(Text, nullable=True)  # Описание файла
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Внешний ключ на заявку
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    ticket = relationship("Ticket", back_populates="attachments")
    
    # Внешний ключ на пользователя, загрузившего файл
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    uploaded_by_user = relationship("User", back_populates="attachments")


# Модель оборудования
class Equipment(Base):
    __tablename__ = "equipment"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String, index=True)  # Тип оборудования (PC, Laptop, Printer, etc.)
    model = Column(String, nullable=True)
    serial_number = Column(String, nullable=True)
    inventory_number = Column(String, nullable=True, index=True)
    location = Column(String, nullable=True)
    status = Column(String, default=EquipmentStatus.ACTIVE)
    purchase_date = Column(DateTime(timezone=True), nullable=True)
    warranty_end_date = Column(DateTime(timezone=True), nullable=True)
    last_maintenance_date = Column(DateTime(timezone=True), nullable=True)
    responsible_person = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Внешний ключ на пользователя, создавшего запись
    created_by_id = Column(Integer, ForeignKey("users.id"))
    created_by = relationship("User", foreign_keys=[created_by_id], back_populates="created_equipment")
    
    # Внешний ключ на пользователя, обновившего запись
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = relationship("User", foreign_keys=[updated_by_id], back_populates="updated_equipment")
    
    # Связь с заявками - временно отключена
    # tickets = relationship("Ticket", back_populates="equipment", post_update=True)
    
    # Связь с записями о техническом обслуживании
    maintenance_records = relationship("Maintenance", back_populates="equipment", cascade="all, delete-orphan")


# Модель технического обслуживания
class Maintenance(Base):
    __tablename__ = "maintenance"
    
    id = Column(Integer, primary_key=True, index=True)
    action_type = Column(String)  # Тип действия (maintenance, repair, etc.)
    description = Column(Text)
    performed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Внешний ключ на оборудование
    equipment_id = Column(Integer, ForeignKey("equipment.id"))
    equipment = relationship("Equipment", back_populates="maintenance_records")
    
    # Внешний ключ на пользователя, выполнившего обслуживание
    performed_by = Column(Integer, ForeignKey("users.id"))
    performed_by_user = relationship("User", back_populates="maintenance_records") 