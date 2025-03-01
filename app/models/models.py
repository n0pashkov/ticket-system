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


# Модель заявки
class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    status = Column(String, default=TicketStatus.NEW)
    priority = Column(Integer, default=1)  # 1 - низкий, 2 - средний, 3 - высокий
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Внешний ключ на создателя
    creator_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User", foreign_keys=[creator_id], back_populates="tickets")
    
    # Внешний ключ на исполнителя (агента)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to = relationship("User", foreign_keys=[assigned_to_id], back_populates="assigned_tickets")
    
    # Связь с комментариями
    comments = relationship("Comment", back_populates="ticket", cascade="all, delete-orphan")


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