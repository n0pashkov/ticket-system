from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, func
from sqlalchemy.orm import selectinload
from fastapi.encoders import jsonable_encoder
import json
from fastapi.responses import JSONResponse

from app.db.async_database import get_async_db
from app.models.models import AuditLog, User, UserRole
from app.core.security import get_current_admin
from app.core.dependencies import get_current_active_user
from app.core.logging import get_logger
from app.core.websocket import ConnectionManager

# Создаем роутер для эндпоинтов аудит-логов
router = APIRouter()
logger = get_logger("api.audit_logs")

# Менеджер WebSocket соединений для обновления в реальном времени
connection_manager = ConnectionManager()

# Кастомный класс для преобразования datetime в строку при сериализации JSON
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# Получение списка аудит-логов
@router.get("/", response_model=List[Dict[str, Any]])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    user_id: Optional[int] = None,
    role: Optional[str] = None,
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)  # Только админы могут просматривать логи
):
    """
    Получение списка аудит-логов с фильтрацией
    """
    try:
        logger.info(f"Запрос журнала аудита от пользователя {current_user.username} (id={current_user.id}, роль={current_user.role})")
        logger.info(f"Параметры запроса: skip={skip}, limit={limit}, action_type={action_type}, "
                  f"entity_type={entity_type}, entity_id={entity_id}, user_id={user_id}, role={role}, "
                  f"from_date={from_date}, to_date={to_date}")
        
        # Начинаем строить запрос
        query = select(AuditLog).options(selectinload(AuditLog.user))
        
        # Добавляем фильтры, если они указаны
        filters = []
        
        if action_type:
            logger.debug(f"Добавлен фильтр по типу действия: {action_type}")
            filters.append(AuditLog.action_type == action_type)
            
        if entity_type:
            logger.debug(f"Добавлен фильтр по типу сущности: {entity_type}")
            filters.append(AuditLog.entity_type == entity_type)
            
        if entity_id:
            logger.debug(f"Добавлен фильтр по ID сущности: {entity_id}")
            filters.append(AuditLog.entity_id == entity_id)
            
        if user_id:
            logger.debug(f"Добавлен фильтр по ID пользователя: {user_id}")
            filters.append(AuditLog.user_id == user_id)
            
        if role:
            logger.debug(f"Добавлен фильтр по роли пользователя: {role}")
            # Подзапрос для фильтрации по роли пользователя
            filters.append(AuditLog.user_id.in_(
                select(User.id).where(User.role == role).scalar_subquery()
            ))
            
        if from_date:
            logger.debug(f"Добавлен фильтр по начальной дате: {from_date}")
            filters.append(AuditLog.created_at >= from_date)
            
        if to_date:
            logger.debug(f"Добавлен фильтр по конечной дате: {to_date}")
            filters.append(AuditLog.created_at <= to_date)
            
        # Применяем фильтры
        if filters:
            query = query.where(and_(*filters))
            
        # Сортируем по дате создания (новые в начале)
        query = query.order_by(desc(AuditLog.created_at))
        
        # Подсчитаем общее количество записей для пагинации
        count_query = select(func.count()).select_from(AuditLog)
        if filters:
            count_query = count_query.where(and_(*filters))
        
        count_result = await db.execute(count_query)
        total_count = count_result.scalar()
        logger.info(f"Найдено всего {total_count} записей в журнале аудита")
        
        # Применяем пагинацию
        query = query.offset(skip).limit(limit)
        
        # Выполняем запрос
        result = await db.execute(query)
        audit_logs = result.scalars().all()
        
        logger.info(f"Получено {len(audit_logs)} записей аудит-логов для текущей страницы")
        
        # Преобразуем объекты в словари для сериализации
        logs_data = []
        for log in audit_logs:
            # Преобразуем дату в строку в формате ISO
            created_at_iso = log.created_at.isoformat() if log.created_at else None
            
            log_dict = {
                "id": log.id,
                "action_type": log.action_type,
                "description": log.description,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "created_at": created_at_iso,  # Теперь это строка, а не объект datetime
                "ip_address": log.ip_address,
                "user_agent": log.user_agent
            }
            
            # Добавляем данные пользователя, если есть
            if log.user:
                log_dict["user"] = {
                    "id": log.user.id,
                    "username": log.user.username,
                    "full_name": log.user.full_name,
                    "role": log.user.role
                }
            else:
                log_dict["user"] = None
                
            # Десериализуем JSON-поля
            try:
                if log.old_values:
                    log_dict["old_values"] = json.loads(log.old_values)
                else:
                    log_dict["old_values"] = None
                    
                if log.new_values:
                    log_dict["new_values"] = json.loads(log.new_values)
                else:
                    log_dict["new_values"] = None
            except json.JSONDecodeError:
                logger.warning(f"Error decoding JSON values for audit log {log.id}")
                log_dict["old_values"] = None
                log_dict["new_values"] = None
                
            logs_data.append(log_dict)
            
        logger.info(f"Возвращаем {len(logs_data)} записей аудит-логов")
        
        # Добавляем заголовок с общим количеством записей для пагинации
        response = logs_data
        headers = {"X-Total-Count": str(total_count)}
        
        return JSONResponse(content=response, headers=headers)
        
    except Exception as e:
        logger.error(f"Ошибка при получении аудит-логов: {str(e)}", exc_info=True)
        raise


# WebSocket для получения обновлений аудит-логов в реальном времени
@router.websocket("/ws")
async def audit_logs_websocket(
    websocket: WebSocket,
    role_filter: Optional[str] = None
):
    """
    Получение обновлений аудит-логов в реальном времени
    """
    await connection_manager.connect(websocket, role_filter)
    try:
        while True:
            # Ожидаем сообщения от клиента
            data = await websocket.receive_text()
            
            # Проверяем, если клиент отправил новый фильтр
            try:
                client_data = json.loads(data)
                if "role_filter" in client_data:
                    connection_manager.update_filter(websocket, client_data["role_filter"])
            except json.JSONDecodeError:
                pass
                
    except WebSocketDisconnect:
        connection_manager.disconnect(websocket)


# Вспомогательная функция для отправки обновлений аудит-логов через WebSocket
async def broadcast_audit_log_update(
    db: AsyncSession,
    background_tasks: BackgroundTasks,
    audit_log_id: int
):
    """
    Отправка обновления аудит-лога через WebSocket
    """
    # Получаем данные аудит-лога
    query = select(AuditLog).options(selectinload(AuditLog.user)).where(AuditLog.id == audit_log_id)
    result = await db.execute(query)
    audit_log = result.scalars().first()
    
    if audit_log:
        # Преобразуем дату в строку в формате ISO
        created_at_iso = audit_log.created_at.isoformat() if audit_log.created_at else None
        
        # Преобразуем объект в словарь
        log_dict = {
            "id": audit_log.id,
            "action_type": audit_log.action_type,
            "description": audit_log.description,
            "entity_type": audit_log.entity_type,
            "entity_id": audit_log.entity_id,
            "created_at": created_at_iso,  # Используем строку вместо объекта datetime
            "ip_address": audit_log.ip_address,
            "user_agent": audit_log.user_agent
        }
        
        # Добавляем данные пользователя, если есть
        if audit_log.user:
            log_dict["user"] = {
                "id": audit_log.user.id,
                "username": audit_log.user.username,
                "full_name": audit_log.user.full_name,
                "role": audit_log.user.role
            }
            
            # Получаем роль пользователя для фильтрации
            user_role = audit_log.user.role
        else:
            log_dict["user"] = None
            user_role = None
            
        # Десериализуем JSON-поля
        try:
            if audit_log.old_values:
                log_dict["old_values"] = json.loads(audit_log.old_values)
            else:
                log_dict["old_values"] = None
                
            if audit_log.new_values:
                log_dict["new_values"] = json.loads(audit_log.new_values)
            else:
                log_dict["new_values"] = None
        except json.JSONDecodeError:
            logger.warning(f"Error decoding JSON values for audit log {audit_log.id}")
            log_dict["old_values"] = None
            log_dict["new_values"] = None
            
        # Отправляем данные через WebSocket (используем dumps без custom encoder, т.к. даты уже преобразованы)
        message = json.dumps(log_dict)
        background_tasks.add_task(connection_manager.broadcast, message, user_role) 