from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.models import Ticket, User, Comment, UserRole, TicketStatus
from app.core.security import get_current_active_user
from app.core.dependencies import get_current_admin

router = APIRouter()


@router.get("/tickets-summary", response_model=Dict[str, Any])
def get_tickets_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Получение общей статистики по заявкам (только для администраторов)
    """
    # Общее количество заявок
    total_tickets = db.query(func.count(Ticket.id)).scalar()
    
    # Количество заявок по статусам
    status_counts = db.query(
        Ticket.status, 
        func.count(Ticket.id)
    ).group_by(Ticket.status).all()
    
    # Количество заявок по приоритетам
    priority_counts = db.query(
        Ticket.priority, 
        func.count(Ticket.id)
    ).group_by(Ticket.priority).all()
    
    # Среднее время обработки заявок (для завершенных)
    avg_resolution_time = db.query(
        func.avg(Ticket.updated_at - Ticket.created_at)
    ).filter(Ticket.status == TicketStatus.COMPLETED).scalar()
    
    # Формируем результат
    result = {
        "total_tickets": total_tickets,
        "status_distribution": {status: count for status, count in status_counts},
        "priority_distribution": {priority: count for priority, count in priority_counts},
        "avg_resolution_time_hours": avg_resolution_time.total_seconds() / 3600 if avg_resolution_time else None
    }
    
    return result


@router.get("/agent-performance", response_model=List[Dict[str, Any]])
def get_agent_performance(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Получение статистики по эффективности работы технических специалистов (только для администраторов)
    """
    # Определяем период для анализа
    period_start = datetime.now() - timedelta(days=days)
    
    # Получаем всех агентов
    agents = db.query(User).filter(User.role == UserRole.AGENT).all()
    
    result = []
    for agent in agents:
        # Количество заявок, назначенных агенту
        assigned_count = db.query(func.count(Ticket.id))\
            .filter(Ticket.assigned_to_id == agent.id)\
            .filter(Ticket.created_at >= period_start)\
            .scalar()
        
        # Количество решенных заявок
        resolved_count = db.query(func.count(Ticket.id))\
            .filter(Ticket.assigned_to_id == agent.id)\
            .filter(Ticket.status == TicketStatus.COMPLETED)\
            .filter(Ticket.updated_at >= period_start)\
            .scalar()
        
        # Среднее время решения
        avg_time = db.query(func.avg(Ticket.updated_at - Ticket.created_at))\
            .filter(Ticket.assigned_to_id == agent.id)\
            .filter(Ticket.status == TicketStatus.COMPLETED)\
            .filter(Ticket.updated_at >= period_start)\
            .scalar()
        
        result.append({
            "agent_id": agent.id,
            "agent_name": agent.full_name,
            "assigned_tickets": assigned_count,
            "resolved_tickets": resolved_count,
            "resolution_rate": resolved_count / assigned_count if assigned_count > 0 else 0,
            "avg_resolution_time_hours": avg_time.total_seconds() / 3600 if avg_time else None
        })
    
    return result


@router.get("/tickets-by-period", response_model=Dict[str, Any])
def get_tickets_by_period(
    period: str = "month",  # day, week, month, year
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Получение статистики по заявкам за определенный период (только для администраторов)
    """
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
    new_tickets = db.query(func.count(Ticket.id))\
        .filter(Ticket.created_at >= period_start)\
        .scalar()
    
    # Количество решенных заявок
    resolved_tickets = db.query(func.count(Ticket.id))\
        .filter(Ticket.status == TicketStatus.COMPLETED)\
        .filter(Ticket.updated_at >= period_start)\
        .scalar()
    
    # Количество отмененных заявок
    cancelled_tickets = db.query(func.count(Ticket.id))\
        .filter(Ticket.status == TicketStatus.CANCELLED)\
        .filter(Ticket.updated_at >= period_start)\
        .scalar()
    
    # Количество заявок в работе
    in_progress_tickets = db.query(func.count(Ticket.id))\
        .filter(Ticket.status == TicketStatus.IN_PROGRESS)\
        .filter(Ticket.updated_at >= period_start)\
        .scalar()
    
    return {
        "period": period,
        "new_tickets": new_tickets,
        "resolved_tickets": resolved_tickets,
        "cancelled_tickets": cancelled_tickets,
        "in_progress_tickets": in_progress_tickets,
        "resolution_rate": resolved_tickets / new_tickets if new_tickets > 0 else 0
    }


@router.get("/user-activity", response_model=Dict[str, List[Dict[str, Any]]])
def get_user_activity(
    top: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Получение статистики по активности пользователей (только для администраторов)
    """
    # Пользователи с наибольшим количеством заявок
    users_with_most_tickets = db.query(
        User.id,
        User.username,
        User.full_name,
        func.count(Ticket.id).label("ticket_count")
    ).join(Ticket, User.id == Ticket.creator_id)\
     .group_by(User.id)\
     .order_by(desc("ticket_count"))\
     .limit(top)\
     .all()
    
    # Пользователи с наибольшим количеством комментариев
    users_with_most_comments = db.query(
        User.id,
        User.username,
        User.full_name,
        func.count(Comment.id).label("comment_count")
    ).join(Comment, User.id == Comment.author_id)\
     .group_by(User.id)\
     .order_by(desc("comment_count"))\
     .limit(top)\
     .all()
    
    return {
        "most_active_by_tickets": [
            {
                "user_id": user_id,
                "username": username,
                "full_name": full_name,
                "ticket_count": ticket_count
            } for user_id, username, full_name, ticket_count in users_with_most_tickets
        ],
        "most_active_by_comments": [
            {
                "user_id": user_id,
                "username": username,
                "full_name": full_name,
                "comment_count": comment_count
            } for user_id, username, full_name, comment_count in users_with_most_comments
        ]
    } 