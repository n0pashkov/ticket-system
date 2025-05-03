from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, desc
from sqlalchemy.exc import SQLAlchemyError

from app.core.security import get_current_active_user
from app.core.dependencies import get_current_agent_or_admin
from app.core.logging import get_logger
from app.db.async_database import get_async_db
from app.models.models import Ticket, User, UserRole, TicketStatus, TicketMessage
from app.schemas.schemas import Ticket as TicketSchema
from app.schemas.schemas import TicketCreate, TicketUpdate, TicketCloseWithMessage, TicketMessage as TicketMessageSchema
from app.core.cache import global_cache

router = APIRouter()
logger = get_logger("api.async_tickets")


@router.post("/async", response_model=TicketSchema, status_code=http_status.HTTP_201_CREATED)
async def create_ticket_async(
    ticket: TicketCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Асинхронное создание новой заявки (доступно всем авторизованным пользователям)
    """
    try:
        # Создаем объект заявки
        db_ticket = Ticket(
            title=ticket.title,
            description=ticket.description,
            priority=ticket.priority,
            category_id=ticket.category_id,
            room_number=ticket.room_number,
            creator_id=current_user.id
        )
        
        # Добавляем в БД
        db.add(db_ticket)
        await db.commit()
        await db.refresh(db_ticket)
        
        # Инвалидируем кэш списка заявок
        background_tasks.add_task(global_cache.invalidate_by_prefix, "tickets:")
        
        logger.info(f"Async ticket created: ID={db_ticket.id}, by user_id={current_user.id}")
        return db_ticket
    except SQLAlchemyError as e:
        logger.error(f"Database error creating ticket async: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка создания заявки"
        )


@router.get("/async", response_model=List[TicketSchema])
async def read_tickets_async(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Фильтр по статусу заявки"),
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Асинхронное получение списка заявок с пагинацией и фильтрацией
    """
    try:
        logger.debug(f"User {current_user.username} requested tickets list (async)")
        
        # Строим запрос с учетом join для связанных данных
        query = select(Ticket)
        
        # Применяем фильтры
        if status:
            query = query.where(Ticket.status == status)
            
        if current_user.role == UserRole.USER:
            # Пользователь видит только свои заявки
            query = query.where(
                and_(
                    Ticket.creator_id == current_user.id,
                    Ticket.is_hidden_for_creator == False
                )
            )
        
        # Сортировка и пагинация
        query = query.order_by(desc(Ticket.created_at)).offset(skip).limit(limit)
        
        # Выполняем запрос
        result = await db.execute(query)
        tickets = result.scalars().all()
        
        logger.debug(f"Retrieved {len(tickets)} tickets async")
        return tickets
    except SQLAlchemyError as e:
        logger.error(f"Database error in read_tickets_async: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении списка заявок"
        )


@router.get("/async/{ticket_id}", response_model=TicketSchema)
async def read_ticket_async(
    ticket_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Асинхронное получение заявки по ID
    """
    try:
        # Составляем запрос на получение заявки
        query = select(Ticket).where(Ticket.id == ticket_id)
        result = await db.execute(query)
        ticket = result.scalars().first()
        
        if not ticket:
            logger.warning(f"Ticket with ID {ticket_id} not found (async)")
            raise HTTPException(status_code=404, detail="Заявка не найдена")
        
        # Проверяем права доступа
        if current_user.role == UserRole.USER:
            if ticket.creator_id != current_user.id:
                logger.warning(f"User {current_user.id} tried to access ticket {ticket_id} without permissions (async)")
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Нет прав для просмотра данной заявки"
                )
            
            if ticket.is_hidden_for_creator:
                logger.warning(f"Ticket {ticket_id} is hidden for creator {current_user.id} (async)")
                raise HTTPException(status_code=404, detail="Заявка не найдена")
        
        logger.debug(f"Ticket {ticket_id} accessed by user {current_user.id} (async)")
        return ticket
    except SQLAlchemyError as e:
        logger.error(f"Database error in read_ticket_async: {str(e)}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении заявки"
        )


@router.put("/async/{ticket_id}", response_model=TicketSchema)
async def update_ticket_async(
    ticket_id: int,
    ticket_update: TicketUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Асинхронное обновление заявки
    """
    try:
        # Получаем заявку
        query = select(Ticket).where(Ticket.id == ticket_id)
        result = await db.execute(query)
        db_ticket = result.scalars().first()
        
        if not db_ticket:
            raise HTTPException(status_code=404, detail="Заявка не найдена")
        
        # Проверяем права доступа
        if current_user.role == UserRole.USER:
            if db_ticket.creator_id != current_user.id:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Нет прав для изменения данной заявки"
                )
            
            # Убираем поля, которые пользователь не может менять
            ticket_data = ticket_update.model_dump(exclude_unset=True)
            if "status" in ticket_data:
                del ticket_data["status"]
            if "assigned_to_id" in ticket_data:
                del ticket_data["assigned_to_id"]
        else:
            # Агенты и администраторы могут менять все поля
            ticket_data = ticket_update.model_dump(exclude_unset=True)
        
        # Если данные для обновления есть
        if ticket_data:
            # Обновляем только измененные поля
            update_stmt = update(Ticket).where(Ticket.id == ticket_id).values(**ticket_data)
            await db.execute(update_stmt)
            await db.commit()
            
            # Инвалидируем кэш
            background_tasks.add_task(global_cache.invalidate_by_prefix, f"tickets:{ticket_id}")
            
            # Получаем обновленную заявку
            result = await db.execute(query)
            db_ticket = result.scalars().first()
        
        logger.info(f"Ticket {ticket_id} updated by user {current_user.id} (async)")
        return db_ticket
    except SQLAlchemyError as e:
        logger.error(f"Database error in update_ticket_async: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при обновлении заявки"
        ) 