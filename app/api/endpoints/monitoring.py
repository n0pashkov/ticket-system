from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy import text

from app.core.resource_monitor import get_system_stats, resource_monitor
from app.core.dependencies import get_current_admin
from app.models.models import User
from app.core.cache import cache_result
from app.core.logging import get_logger
from app.db.database import get_db

router = APIRouter()
logger = get_logger("api.monitoring")


@router.get("/system", response_model=Dict[str, Any])
@cache_result(prefix="monitor", ttl=60)  # Кэшируем на 1 минуту
def get_system_metrics(
    current_user: User = Depends(get_current_admin)
):
    """
    Получение метрик системы (только для администраторов)
    """
    logger.debug("Запрос метрик системы")
    return get_system_stats()


@router.get("/database", response_model=Dict[str, Any])
def get_database_metrics(
    current_user: User = Depends(get_current_admin),
    db = Depends(get_db)
):
    """
    Получение метрик базы данных (только для администраторов)
    """
    logger.debug("Запрос метрик базы данных")
    
    # Используем низкоуровневый SQL для получения информации о БД
    try:
        # Для SQLite
        db_info = {}
        
        # Информация о статусе
        result = db.execute(text("PRAGMA quick_check")).scalar()
        db_info["status"] = result
        
        # Информация о версии
        result = db.execute(text("SELECT sqlite_version()")).scalar()
        db_info["version"] = result
        
        # Информация о размере
        result = db.execute(text("PRAGMA page_count")).scalar()
        page_count = result
        
        result = db.execute(text("PRAGMA page_size")).scalar()
        page_size = result
        
        db_info["size_bytes"] = page_count * page_size
        db_info["page_count"] = page_count
        db_info["page_size"] = page_size
        
        # Количество таблиц
        result = db.execute(text("SELECT count(*) FROM sqlite_master WHERE type='table'")).scalar()
        db_info["tables_count"] = result
        
        # Количество индексов
        result = db.execute(text("SELECT count(*) FROM sqlite_master WHERE type='index'")).scalar()
        db_info["indexes_count"] = result
        
        # Метрики выполнения запросов
        db_info["query_metrics"] = {
            "note": "SQLite doesn't provide built-in query metrics. Consider adding custom metrics."
        }
        
        return {
            "database_type": "SQLite",
            "info": db_info
        }
    except Exception as e:
        logger.error(f"Error retrieving database metrics: {str(e)}")
        return {
            "database_type": "Unknown",
            "error": str(e)
        }


@router.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """
    Расширенная проверка работоспособности системы
    """
    # Проверка доступности основных компонентов системы
    system_metrics = get_system_stats()
    
    # Проверяем нагрузку CPU
    cpu_load = system_metrics.get("cpu_percent", 0)
    memory_usage = system_metrics.get("memory_percent", 0)
    
    # Определяем статус системы
    status_code = status.HTTP_200_OK
    system_status = "healthy"
    
    # Если CPU или память загружены более чем на 90%
    if cpu_load > 90 or memory_usage > 90:
        system_status = "degraded"
    
    return {
        "status": system_status,
        "components": {
            "api": "up",
            "database": "up"
        },
        "metrics": {
            "cpu_load": cpu_load,
            "memory_usage": memory_usage,
            "disk_usage": system_metrics.get("disk_percent", 0)
        }
    }


@router.post("/start-monitoring", status_code=status.HTTP_200_OK)
def start_monitoring(
    current_user: User = Depends(get_current_admin)
):
    """
    Запускает мониторинг ресурсов системы (только для администраторов)
    """
    resource_monitor.start()
    return {"status": "ok", "message": "Monitoring started"}


@router.post("/stop-monitoring", status_code=status.HTTP_200_OK)
def stop_monitoring(
    current_user: User = Depends(get_current_admin)
):
    """
    Останавливает мониторинг ресурсов системы (только для администраторов)
    """
    resource_monitor.stop()
    return {"status": "ok", "message": "Monitoring stopped"} 