from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, desc, and_, select
from datetime import datetime, timedelta

from app.db.async_database import get_async_db
from app.models.models import Ticket, User, UserRole, TicketStatus
from app.core.security import get_current_active_user
from app.core.dependencies import get_current_admin
from app.core.cache import cache_result
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("api.statistics")


@router.get("/tickets-summary", response_model=Dict[str, Any])
@cache_result(prefix="stats", ttl=600)  # Кэшируем на 10 минут
async def get_tickets_summary(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Получение общей статистики по заявкам (только для администраторов)
    """
    logger.debug("Выполняется запрос статистики по заявкам")
    
    # Общее количество заявок
    query = select(func.count(Ticket.id))
    result = await db.execute(query)
    total_tickets = result.scalar()
    
    # Количество заявок по статусам
    query = select(
        Ticket.status, 
        func.count(Ticket.id)
    ).group_by(Ticket.status)
    result = await db.execute(query)
    status_counts = result.all()
    
    # Количество заявок по приоритетам
    query = select(
        Ticket.priority, 
        func.count(Ticket.id)
    ).group_by(Ticket.priority)
    result = await db.execute(query)
    priority_counts = result.all()
    
    # Среднее время обработки заявок (для завершенных)
    query = select(
        func.avg(Ticket.updated_at - Ticket.created_at)
    ).filter(Ticket.status == TicketStatus.CLOSED)
    result = await db.execute(query)
    avg_resolution_time = result.scalar()
    
    # Формируем результат
    summary_result = {
        "total_tickets": total_tickets,
        "status_distribution": {status: count for status, count in status_counts},
        "priority_distribution": {priority: count for priority, count in priority_counts},
        "avg_resolution_time_hours": avg_resolution_time.total_seconds() / 3600 if avg_resolution_time else None
    }
    
    logger.debug(f"Результаты статистики по заявкам: {len(status_counts)} статусов, {len(priority_counts)} приоритетов")
    return summary_result


@router.get("/agent-performance", response_model=List[Dict[str, Any]])
@cache_result(prefix="stats", ttl=1800)  # Кэшируем на 30 минут
async def get_agent_performance(
    days: int = 30,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Получение статистики по эффективности работы технических специалистов (только для администраторов)
    """
    logger.debug(f"Запрос статистики по агентам за {days} дней")
    
    # Определяем период для анализа
    period_start = datetime.now() - timedelta(days=days)
    
    # Получаем всех агентов
    query = select(User).filter(User.role == UserRole.AGENT)
    result = await db.execute(query)
    agents = result.scalars().all()
    
    performance_result = []
    for agent in agents:
        # Количество заявок, назначенных агенту
        query = select(func.count(Ticket.id))\
            .filter(Ticket.assigned_to_id == agent.id)\
            .filter(Ticket.created_at >= period_start)
        assigned_result = await db.execute(query)
        assigned_count = assigned_result.scalar()
        
        # Количество решенных заявок
        query = select(func.count(Ticket.id))\
            .filter(Ticket.assigned_to_id == agent.id)\
            .filter(Ticket.status == TicketStatus.CLOSED)\
            .filter(Ticket.updated_at >= period_start)
        resolved_result = await db.execute(query)
        resolved_count = resolved_result.scalar()
        
        # Среднее время решения
        query = select(func.avg(Ticket.updated_at - Ticket.created_at))\
            .filter(Ticket.assigned_to_id == agent.id)\
            .filter(Ticket.status == TicketStatus.CLOSED)\
            .filter(Ticket.updated_at >= period_start)
        avg_result = await db.execute(query)
        avg_time = avg_result.scalar()
        
        performance_result.append({
            "agent_id": agent.id,
            "agent_name": agent.full_name,
            "assigned_tickets": assigned_count,
            "resolved_tickets": resolved_count,
            "resolution_rate": resolved_count / assigned_count if assigned_count > 0 else 0,
            "avg_resolution_time_hours": avg_time.total_seconds() / 3600 if avg_time else None
        })
    
    logger.debug(f"Получена статистика по {len(agents)} агентам")
    return performance_result


@router.get("/tickets-by-period", response_model=Dict[str, Any])
@cache_result(prefix="stats", ttl=900)  # Кэшируем на 15 минут
async def get_tickets_by_period(
    period: str = "month",  # day, week, month, year
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Получение статистики по заявкам за определенный период (только для администраторов)
    """
    logger.debug(f"Запрос статистики по заявкам за период: {period}")
    
    # Определяем начало периода
    now = datetime.now()
    if period == "day":
        period_start = now - timedelta(days=1)
    elif period == "week":
        period_start = now - timedelta(weeks=1)
    elif period == "year":
        period_start = now - timedelta(days=365)
    else:  # month по умолчанию
        period_start = now - timedelta(days=30)
    
    # Количество новых заявок
    query = select(func.count(Ticket.id))\
        .filter(Ticket.created_at >= period_start)
    result = await db.execute(query)
    new_tickets = result.scalar()
    
    # Количество решенных заявок
    query = select(func.count(Ticket.id))\
        .filter(Ticket.status == TicketStatus.CLOSED)\
        .filter(Ticket.updated_at >= period_start)
    result = await db.execute(query)
    resolved_tickets = result.scalar()
    
    # Количество заявок в работе
    query = select(func.count(Ticket.id))\
        .filter(Ticket.status == TicketStatus.IN_PROGRESS)\
        .filter(Ticket.updated_at >= period_start)
    result = await db.execute(query)
    in_progress_tickets = result.scalar()
    
    period_result = {
        "period": period,
        "new_tickets": new_tickets,
        "resolved_tickets": resolved_tickets,
        "in_progress_tickets": in_progress_tickets,
        "resolution_rate": resolved_tickets / new_tickets if new_tickets > 0 else 0
    }
    
    logger.debug(f"Статистика по заявкам за период {period}: {new_tickets} новых, {resolved_tickets} решенных")
    return period_result


@router.get("/user-activity", response_model=Dict[str, List[Dict[str, Any]]])
@cache_result(prefix="stats", ttl=1200)  # Кэшируем на 20 минут
async def get_user_activity(
    top: int = 10,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Получение статистики по активности пользователей (только для администраторов)
    """
    logger.debug(f"Запрос статистики активности пользователей (top {top})")
    
    # Пользователи с наибольшим количеством заявок
    query = select(
        User.id,
        User.username,
        User.full_name,
        func.count(Ticket.id).label("ticket_count")
    ).join(Ticket, User.id == Ticket.creator_id)\
     .group_by(User.id)\
     .order_by(desc("ticket_count"))\
     .limit(top)
    
    result = await db.execute(query)
    users_with_most_tickets = result.all()
    
    activity_result = {
        "most_active_by_tickets": [
            {
                "user_id": user_id,
                "username": username,
                "full_name": full_name,
                "ticket_count": ticket_count
            } for user_id, username, full_name, ticket_count in users_with_most_tickets
        ]
    }
    
    logger.debug(f"Получена статистика по {len(users_with_most_tickets)} самым активным пользователям")
    return activity_result 