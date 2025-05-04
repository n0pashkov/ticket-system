from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query, Response, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.core.security import get_current_active_user
from app.core.dependencies import get_current_agent_or_admin
from app.core.logging import get_logger, log_user_action
from app.db.database import get_db
from app.models.models import Ticket, User, UserRole, TicketStatus, TicketMessage, TicketCategory
from app.schemas.schemas import Ticket as TicketSchema
from app.schemas.schemas import TicketCreate, TicketUpdate, TicketCloseWithMessage, TicketMessage as TicketMessageSchema
from app.schemas.schemas import TicketCategory as TicketCategorySchema

router = APIRouter()
logger = get_logger("api.tickets")


# Создание новой заявки (доступно всем авторизованным пользователям)
@router.post("/", response_model=TicketSchema, status_code=http_status.HTTP_201_CREATED)
def create_ticket(
    ticket: TicketCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        db_ticket = Ticket(
            title=ticket.title,
            description=ticket.description,
            priority=ticket.priority,
            category_id=ticket.category_id,
            room_number=ticket.room_number,
            equipment_id=ticket.equipment_id,
            creator_id=current_user.id
        )
        db.add(db_ticket)
        db.commit()
        db.refresh(db_ticket)
        
        # Логируем создание заявки
        log_user_action(
            db=db,
            user=current_user,
            action_type="CREATE",
            description=f"Создана новая заявка: {ticket.title}",
            entity_type="ticket",
            entity_id=db_ticket.id,
            new_values={
                "title": ticket.title,
                "description": ticket.description,
                "priority": ticket.priority,
                "category_id": ticket.category_id,
                "room_number": ticket.room_number,
                "equipment_id": ticket.equipment_id
            },
            request=request
        )
        
        logger.info(f"Ticket created: ID={db_ticket.id}, by user_id={current_user.id}")
        return db_ticket
    except SQLAlchemyError as e:
        logger.error(f"Database error creating ticket: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка создания заявки"
        )


# Получение списка заявок
@router.get("/", response_model=List[TicketSchema])
def read_tickets(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Фильтр по статусу заявки"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        logger.debug(f"User {current_user.username} (role: {current_user.role}) requested tickets list")
        logger.debug(f"Query parameters - skip: {skip}, limit: {limit}, status: {status}")
        
        # Строим запрос к БД с предварительной загрузкой связанных данных
        query = db.query(Ticket).options(
            joinedload(Ticket.creator),
            joinedload(Ticket.assigned_to),
            joinedload(Ticket.category)
        )
        
        # Фильтрация по статусу, если указан
        if status:
            logger.debug(f"Filtering by status: {status}")
            query = query.filter(Ticket.status == status)
        
        # Фильтрация по типу пользователя
        if current_user.role == UserRole.USER:
            logger.debug(f"User role is USER, filtering by creator_id: {current_user.id}")
            # Обычный пользователь видит только свои заявки, которые не скрыты
            query = query.filter(Ticket.creator_id == current_user.id, Ticket.is_hidden_for_creator == False)
        
        # Выполняем запрос с пагинацией
        db_tickets = query.order_by(Ticket.created_at.desc()).offset(skip).limit(limit).all()
        logger.debug(f"Retrieved {len(db_tickets)} tickets")
        
        return db_tickets
    except SQLAlchemyError as e:
        logger.error(f"Database error in read_tickets: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении списка заявок"
        )
    except Exception as e:
        logger.error(f"Unexpected error in read_tickets: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера"
        )


# Получение конкретной заявки по ID
@router.get("/{ticket_id}", response_model=TicketSchema)
def read_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Получаем заявку с предварительной загрузкой связанных данных
        ticket = db.query(Ticket).options(
            joinedload(Ticket.creator),
            joinedload(Ticket.assigned_to),
            joinedload(Ticket.category)
        ).filter(Ticket.id == ticket_id).first()
        
        if not ticket:
            logger.warning(f"Ticket with ID {ticket_id} not found")
            raise HTTPException(status_code=404, detail="Заявка не найдена")
        
        # Проверка прав доступа к заявке
        if current_user.role == UserRole.USER:
            if ticket.creator_id != current_user.id:
                logger.warning(f"User {current_user.id} tried to access ticket {ticket_id} without permissions")
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Нет прав для просмотра данной заявки"
                )
            # Проверяем, не скрыта ли заявка для пользователя
            if ticket.is_hidden_for_creator:
                logger.warning(f"Ticket {ticket_id} is hidden for creator {current_user.id}")
                raise HTTPException(status_code=404, detail="Заявка не найдена")
        
        logger.debug(f"Ticket {ticket_id} accessed by user {current_user.id}")
        return ticket
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving ticket {ticket_id}: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении заявки"
        )


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
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_or_admin)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Если пользователь - администратор, ему разрешены любые изменения
    # Агент теперь тоже может менять статус любой заявки
    
    # Сохраняем предыдущий статус для логирования
    old_status = db_ticket.status
    
    # Меняем статус
    db_ticket.status = status
    
    # Логируем действие
    log_user_action(
        db=db,
        user=current_user,
        action_type="UPDATE",
        description=f"Изменен статус заявки #{ticket_id} с '{old_status}' на '{status}'",
        entity_type="ticket",
        entity_id=ticket_id,
        old_values={"status": old_status},
        new_values={"status": status},
        request=request
    )
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


@router.post("/{ticket_id}/assign", response_model=TicketSchema)
def assign_ticket_to_current_agent(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Проверка роли пользователя
    if current_user.role != UserRole.AGENT and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Только агенты и администраторы могут назначать заявки"
        )
    
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Сохраняем предыдущие значения для логирования
    old_assigned_to_id = db_ticket.assigned_to_id
    old_status = db_ticket.status
    
    # Назначаем заявку текущему агенту
    db_ticket.assigned_to_id = current_user.id
    
    # Если заявка была в статусе NEW, меняем статус на IN_PROGRESS
    if db_ticket.status == TicketStatus.NEW:
        db_ticket.status = TicketStatus.IN_PROGRESS
    
    # Логируем действие
    log_user_action(
        db=db,
        user=current_user,
        action_type="UPDATE",
        description=f"Заявка #{ticket_id} назначена на агента {current_user.username}",
        entity_type="ticket",
        entity_id=ticket_id,
        old_values={
            "assigned_to_id": old_assigned_to_id,
            "status": old_status
        },
        new_values={
            "assigned_to_id": current_user.id,
            "status": db_ticket.status
        },
        request=request
    )
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


@router.post("/{ticket_id}/close", response_model=TicketSchema)
def close_ticket(
    ticket_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на закрытие заявки
    # Агенты и администраторы могут закрывать любые заявки
    if current_user.role == UserRole.USER:
        # Обычный пользователь может закрывать только свои заявки
        if db_ticket.creator_id != current_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Нет прав для закрытия данной заявки"
            )
    
    # Сохраняем предыдущий статус для логирования
    old_status = db_ticket.status
    
    # Закрываем заявку
    db_ticket.status = TicketStatus.CLOSED
    
    # Логируем действие
    log_user_action(
        db=db,
        user=current_user,
        action_type="UPDATE",
        description=f"Заявка #{ticket_id} закрыта пользователем {current_user.username}",
        entity_type="ticket",
        entity_id=ticket_id,
        old_values={"status": old_status},
        new_values={"status": TicketStatus.CLOSED},
        request=request
    )
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


# Закрытие заявки с сообщением (для агентов)
@router.post("/{ticket_id}/close-with-message", response_model=TicketSchema)
def close_ticket_with_message(
    ticket_id: int,
    data: TicketCloseWithMessage,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на закрытие заявки
    if current_user.role not in [UserRole.AGENT, UserRole.ADMIN]:
        # Только агенты и администраторы могут закрывать заявки с сообщением
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Только агенты и администраторы могут закрывать заявки с сообщением"
        )
    
    # Создаем сообщение
    new_message = TicketMessage(
        message=data.message,
        ticket_id=ticket_id,
        user_id=current_user.id
    )
    db.add(new_message)
    
    # Закрываем заявку
    db_ticket.status = TicketStatus.CLOSED
    
    db.commit()
    db.refresh(db_ticket)
    return db_ticket


# Получение сообщений к заявке
@router.get("/{ticket_id}/messages", response_model=List[TicketMessageSchema])
def get_ticket_messages(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на просмотр заявки
    if current_user.role == UserRole.USER:
        if db_ticket.creator_id != current_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Нет прав для просмотра данной заявки"
            )
        # Проверяем, не скрыта ли заявка для пользователя
        if db_ticket.is_hidden_for_creator:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Получаем сообщения
    messages = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket_id).order_by(TicketMessage.created_at).all()
    return messages

# Получение количества сообщений к заявке
@router.get("/{ticket_id}/messages/count", response_model=dict)
def get_ticket_messages_count(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на просмотр заявки
    if current_user.role == UserRole.USER:
        if db_ticket.creator_id != current_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Нет прав для просмотра данной заявки"
            )
        # Проверяем, не скрыта ли заявка для пользователя
        if db_ticket.is_hidden_for_creator:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Получаем количество сообщений
    count = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket_id).count()
    return {"count": count}

@router.get("/categories", response_model=List[TicketCategorySchema])
def read_ticket_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка категорий заявок.
    Данные кэшируются на стороне клиента на 10 минут.
    """
    categories = db.query(TicketCategory).offset(skip).limit(limit).all()
    
    # Преобразуем объекты в JSON-совместимый формат
    data = jsonable_encoder(categories)
    
    # Создаем JSON ответ
    response = JSONResponse(content=data)
    
    # Добавляем заголовки для кэширования этого редко меняющегося ресурса
    response.headers["Cache-Control"] = "public, max-age=600, stale-while-revalidate=60"  # 10 минут
    response.headers["Vary"] = "Accept"
    
    return response

@router.delete("/{ticket_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Получаем заявку из БД
    db_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Заявка не найдена")
    
    # Проверка прав на удаление заявки
    if current_user.role == UserRole.ADMIN:
        # Админ может удалить любую заявку полностью
        db.delete(db_ticket)
    elif current_user.role == UserRole.USER and db_ticket.creator_id == current_user.id:
        # Пользователь может только скрыть свою заявку (мягкое удаление)
        db_ticket.is_hidden_for_creator = True
        db.commit()
    else:
        # Агенты и другие пользователи не могут удалять заявки
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Нет прав для удаления данной заявки"
        )
    
    db.commit()
    return None 