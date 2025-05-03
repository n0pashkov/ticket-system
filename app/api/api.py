from fastapi import APIRouter

from app.api.endpoints import auth, users, tickets, statistics, equipment, categories, monitoring
from app.core.logging import get_logger

logger = get_logger("api")

# Создаем основной API роутер
api_router = APIRouter()

# Подключаем эндпоинты для аутентификации
logger.debug("Registering auth router")
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Подключаем эндпоинты для пользователей
logger.debug("Registering users router")
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Подключаем эндпоинты для заявок
logger.debug("Registering tickets router")
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])

# Подключаем эндпоинты для статистики и отчетности
logger.debug("Registering statistics router")
api_router.include_router(statistics.router, prefix="/statistics", tags=["statistics"])

# Подключаем эндпоинты для оборудования
logger.debug("Registering equipment router")
api_router.include_router(equipment.router, prefix="/equipment", tags=["equipment"])

# Подключаем эндпоинты для категорий заявок
logger.debug("Registering categories router")
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])

# Подключаем эндпоинты для мониторинга системы
logger.debug("Registering monitoring router")
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"]) 