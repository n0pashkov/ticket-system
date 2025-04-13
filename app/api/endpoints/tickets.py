from typing import List
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_active_user
from app.core.dependencies import get_current_agent_or_admin
from app.db.database import get_db
from app.models.models import Ticket, User, Comment, UserRole, TicketStatus
from app.schemas.schemas import Ticket as TicketSchema
from app.schemas.schemas import TicketCreate, TicketUpdate, CommentCreate, Comment as CommentSchema

router = APIRouter()


# Создание новой заявки (доступно всем авторизованным пользователям)
@router.post("/", response_model=TicketSchema, status_code=http_status.HTTP_201_CREATED)
def create_ticket(
    ticket: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_ticket = Ticket(
        title=ticket.title,
        description=ticket.description,
        priority=ticket.priority,
        category_id=ticket.category_id,
        creator_id=current_user.id
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


# Получение списка заявок
@router.get("/", response_model=List[TicketSchema])
def read_tickets(
    skip: int = 0,
    limit: int = 100,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        print(f">>> DEBUG: User {current_user.username} (role: {current_user.role}) requested tickets list")
        print(f">>> DEBUG: Query parameters - skip: {skip}, limit: {limit}, status: {status}")
        
        # Строим запрос к БД
        query = db.query(Ticket)
        
        # Фильтрация по статусу, если указан
        if status:
            print(f">>> DEBUG: Filtering by status: {status}")
            query = query.filter(Ticket.status == status)
        
        # Фильтрация по типу пользователя
        if current_user.role == UserRole.USER:
            print(f">>> DEBUG: User role is USER, filtering by creator_id: {current_user.id}")
            # Обычный пользователь видит только свои заявки
            query = query.filter(Ticket.creator_id == current_user.id)
        else:
            print(f">>> DEBUG: User role is {current_user.role}, showing all tickets")
        
        # Выполняем запрос с пагинацией
        try:
            db_tickets = query.offset(skip).limit(limit).all()
            print(f">>> DEBUG: Got {len(db_tickets)} tickets")
            
            # Преобразуем объекты перед возвратом
            tickets = []
            for db_ticket in db_tickets:
                # Преобразуем числовой приоритет в строку, если нужно
                if isinstance(db_ticket.priority, int):
                    priority_map = {1: "low", 2: "medium", 3: "high", 4: "critical"}
                    priority = priority_map.get(db_ticket.priority, "medium")
                else:
                    priority = db_ticket.priority
                
                # Получаем ID комментариев вместо объектов
                comment_ids = [comment.id for comment in db_ticket.comments] if db_ticket.comments else []
                
                # Создаем словарь с данными тикета с правильными типами
                ticket_dict = {
                    "id": db_ticket.id,
                    "title": db_ticket.title,
                    "description": db_ticket.description,
                    "status": db_ticket.status,
                    "priority": priority,
                    "category": getattr(db_ticket, "category", None),
                    "created_at": db_ticket.created_at,
                    "updated_at": db_ticket.updated_at,
                    "creator_id": db_ticket.creator_id,
                    "assigned_to_id": db_ticket.assigned_to_id,
                    "resolution": db_ticket.resolution,
                    "comments": comment_ids
                }
                tickets.append(ticket_dict)
                
            return tickets
        except Exception as db_error:
            print(f">>> DEBUG: Database error: {db_error}")
            raise
    except Exception as e:
        print(f">>> DEBUG: Error in read_tickets: {e}")
        print(f">>> DEBUG: Error type: {type(e)}")
        raise


# Получение конкретной заявки по ID
@router.get("/{ticket_id}", response_model=TicketSchema)
def read_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав доступа к заявке
    if current_user.role == UserRole.USER and ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра данной заявки"
        )
    
    # Агенты и администраторы могут просматривать все заявки
    
    return ticket


# Обновление заявки
@router.put("/{ticket_id}", response_model=TicketSchema)
def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на обновление заявки
    if current_user.role == UserRole.USER:
        # Обычный пользователь может изменять только свои заявки и не может менять статус или назначать исполнителя
        if db_ticket.creator_id != current_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Нет прав для изменения данной заявки"
            )
        
        # Убираем поля, которые пользователь не может изменять
        ticket_data = ticket_update.model_dump(exclude_unset=True)
        if "status" in ticket_data:
            del ticket_data["status"]
        if "assigned_to_id" in ticket_data:
            del ticket_data["assigned_to_id"]
        
        # Обновляем заявку
        for key, value in ticket_data.items():
            setattr(db_ticket, key, value)
    
    elif current_user.role in [UserRole.AGENT, UserRole.ADMIN]:
        # Агенты и администраторы могут обновлять любые заявки без ограничений
        ticket_data = ticket_update.model_dump(exclude_unset=True)
        for key, value in ticket_data.items():
            setattr(db_ticket, key, value)
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


# Назначение заявки на агента (доступно только агентам и администраторам)
@router.put("/{ticket_id}/assign/{agent_id}", response_model=TicketSchema)
def assign_ticket(
    ticket_id: int,
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_or_admin)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверяем, существует ли агент
    agent = db.query(User).filter(User.id == agent_id, User.role == UserRole.AGENT).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Агент не найден")
    
    # Назначаем заявку
    db_ticket.assigned_to_id = agent_id
    if db_ticket.status == TicketStatus.NEW:
        db_ticket.status = TicketStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


# Изменение статуса заявки (доступно только агентам и администраторам)
@router.put("/{ticket_id}/status/{status}", response_model=TicketSchema)
def update_ticket_status(
    ticket_id: int,
    status: TicketStatus,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_or_admin)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Агент может менять статус только назначенных на него заявок
    if (current_user.role == UserRole.AGENT and 
        db_ticket.assigned_to_id != current_user.id and 
        current_user.id != db_ticket.creator_id):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для изменения статуса данной заявки"
        )
    
    # Меняем статус
    db_ticket.status = status
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


# Добавление комментария к заявке
@router.post("/{ticket_id}/comments/", response_model=CommentSchema)
def create_comment(
    ticket_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на комментирование заявки
    if current_user.role == UserRole.USER and db_ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для комментирования данной заявки"
        )
    
    if (current_user.role == UserRole.AGENT and 
        db_ticket.creator_id != current_user.id and 
        db_ticket.assigned_to_id != current_user.id):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для комментирования данной заявки"
        )
    
    # Создаем комментарий
    db_comment = Comment(
        text=comment.text,
        author_id=current_user.id,
        ticket_id=ticket_id
    )
    
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


# Получение комментариев к заявке
@router.get("/{ticket_id}/comments/", response_model=List[CommentSchema])
def read_comments(
    ticket_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на просмотр комментариев
    if current_user.role == UserRole.USER and db_ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра комментариев данной заявки"
        )
    
    if (current_user.role == UserRole.AGENT and 
        db_ticket.creator_id != current_user.id and 
        db_ticket.assigned_to_id != current_user.id):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра комментариев данной заявки"
        )
    
    # Получаем комментарии
    comments = db.query(Comment).filter(Comment.ticket_id == ticket_id).offset(skip).limit(limit).all()
    return comments


# Назначение заявки на текущего агента
@router.post("/{ticket_id}/assign", response_model=TicketSchema)
def assign_ticket_to_current_agent(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Проверка роли пользователя
    if current_user.role != UserRole.AGENT and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Только технические специалисты и администраторы могут назначать заявки"
        )
    
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Назначаем заявку на текущего пользователя
    db_ticket.assigned_to_id = current_user.id
    if db_ticket.status == TicketStatus.NEW:
        db_ticket.status = TicketStatus.IN_PROGRESS
    
    db.commit()
    db.refresh(db_ticket)
    
    # Преобразуем числовой приоритет в строку, если нужно
    if isinstance(db_ticket.priority, int):
        priority_map = {1: "low", 2: "medium", 3: "high", 4: "critical"}
        priority = priority_map.get(db_ticket.priority, "medium")
    else:
        priority = db_ticket.priority
    
    # Получаем ID комментариев вместо объектов
    comment_ids = [comment.id for comment in db_ticket.comments] if db_ticket.comments else []
    
    # Создаем словарь с данными тикета с правильными типами
    ticket_dict = {
        "id": db_ticket.id,
        "title": db_ticket.title,
        "description": db_ticket.description,
        "status": db_ticket.status,
        "priority": priority,
        "category": getattr(db_ticket, "category", None),
        "created_at": db_ticket.created_at,
        "updated_at": db_ticket.updated_at,
        "creator_id": db_ticket.creator_id,
        "assigned_to_id": db_ticket.assigned_to_id,
        "resolution": db_ticket.resolution,
        "comments": comment_ids
    }
    
    return ticket_dict


# Закрытие заявки
@router.post("/{ticket_id}/close", response_model=TicketSchema)
def close_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на закрытие заявки
    if current_user.role == UserRole.USER and db_ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для закрытия данной заявки"
        )
    
    # Агенты и администраторы могут закрывать любые заявки
    
    # Меняем статус
    db_ticket.status = "closed"
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


# Повторное открытие заявки
@router.post("/{ticket_id}/reopen", response_model=TicketSchema)
def reopen_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на повторное открытие заявки
    if current_user.role == UserRole.USER and db_ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для повторного открытия данной заявки"
        )
    
    # Агенты и администраторы могут повторно открывать любые заявки
    
    # Меняем статус
    if db_ticket.status == TicketStatus.COMPLETED or db_ticket.status == TicketStatus.CANCELLED or db_ticket.status == "closed":
        db_ticket.status = "reopened"
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


# Удаление заявки (доступно только администраторам)
@router.delete("/{ticket_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Проверяем, что пользователь является администратором
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Только администраторы могут удалять заявки"
        )
    
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Удаляем заявку
    db.delete(db_ticket)
    db.commit()
    
    return None 