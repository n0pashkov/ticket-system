import logging
import sys
from typing import Any, Dict, Optional
import json
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.config import settings
# Удаляем импорт здесь, чтобы избежать циклического импорта
# from app.models.models import AuditLog, User, AuditActionType

# Настройка логгера
def setup_logging() -> None:
    log_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Создаем корневой логгер
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Обработчик для вывода в консоль
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)

    # Логгер для API
    api_logger = logging.getLogger("api")
    api_logger.setLevel(logging.INFO)
    
    # В режиме разработки устанавливаем уровень DEBUG
    if settings.ENVIRONMENT == "development":
        api_logger.setLevel(logging.DEBUG)
        root_logger.setLevel(logging.DEBUG)
    
    # Отключаем лишние отладочные сообщения
    configure_specific_loggers()

# Настройка уровней логирования для конкретных логгеров
def configure_specific_loggers() -> None:
    """
    Отключаем слишком подробные отладочные сообщения от определенных модулей,
    таких как aiosqlite, оставляя только важные сообщения
    """
    # Устанавливаем уровень WARNING для библиотек SQLite
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)
    logging.getLogger("sqlite3").setLevel(logging.WARNING)
    
    # Устанавливаем уровень INFO для собственных модулей базы данных
    # чтобы видеть только важные сообщения, но не отладочную информацию
    logging.getLogger("async_database").setLevel(logging.INFO)
    logging.getLogger("database").setLevel(logging.INFO)
    
    # Другие модули, которые могут генерировать много логов
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)

# Получение логгера для API
def get_logger(name: str = "api") -> logging.Logger:
    return logging.getLogger(name)

async def log_user_action_async(
    db: AsyncSession,
    user,  # Удаляем типизацию User
    action_type: str,
    description: str,
    entity_type: str = None,
    entity_id: int = None,
    old_values: dict = None,
    new_values: dict = None,
    request: Request = None
):
    """
    Асинхронное логирование действия пользователя
    """
    try:
        # Импортируем AuditLog внутри функции
        from app.models.models import AuditLog
        
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host
            user_agent = request.headers.get("User-Agent")
            
        # Преобразование словарей в JSON, если они есть
        old_values_json = json.dumps(old_values) if old_values else None
        new_values_json = json.dumps(new_values) if new_values else None
            
        # Создаем запись аудит-лога
        audit_log = AuditLog(
            user_id=user.id if user else None,
            action_type=action_type,
            description=description,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values_json,
            new_values=new_values_json,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(audit_log)
        await db.flush()
        await db.commit()
        
        # Логируем успешное создание записи
        logger = get_logger("audit.async")
        logger.info(f"Audit log created: {action_type} - {description}")
        
    except Exception as e:
        logger = get_logger("audit.async")
        logger.error(f"Error logging user action: {str(e)}")

def log_user_action(
    db: Session,
    user,  # Удаляем типизацию User
    action_type: str,
    description: str,
    entity_type: str = None,
    entity_id: int = None,
    old_values: dict = None,
    new_values: dict = None,
    request: Request = None
):
    """
    Синхронное логирование действия пользователя
    """
    try:
        # Импортируем AuditLog внутри функции
        from app.models.models import AuditLog
        
        ip_address = None
        user_agent = None
        
        if request:
            ip_address = request.client.host
            user_agent = request.headers.get("User-Agent")
            
        # Преобразование словарей в JSON, если они есть
        old_values_json = json.dumps(old_values) if old_values else None
        new_values_json = json.dumps(new_values) if new_values else None
            
        # Создаем запись аудит-лога
        audit_log = AuditLog(
            user_id=user.id if user else None,
            action_type=action_type,
            description=description,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=old_values_json,
            new_values=new_values_json,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        db.add(audit_log)
        db.flush()
        db.commit()
        
        # Логируем успешное создание записи
        logger = get_logger("audit")
        logger.info(f"Audit log created: {action_type} - {description}")
        
    except Exception as e:
        logger = get_logger("audit")
        logger.error(f"Error logging user action: {str(e)}") 