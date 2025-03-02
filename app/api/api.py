from fastapi import APIRouter

from app.api.endpoints import auth, users, tickets, comments, statistics, notifications, attachments, equipment

# Создаем основной API роутер
api_router = APIRouter()

# Подключаем эндпоинты для аутентификации
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Подключаем эндпоинты для пользователей
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Подключаем эндпоинты для заявок
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])

# Подключаем эндпоинты для комментариев
api_router.include_router(comments.router, prefix="/comments", tags=["comments"])

# Подключаем эндпоинты для статистики и отчетности
api_router.include_router(statistics.router, prefix="/statistics", tags=["statistics"])

# Подключаем эндпоинты для уведомлений
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

# Подключаем эндпоинты для вложений
api_router.include_router(attachments.router, prefix="/attachments", tags=["attachments"])

# Подключаем эндпоинты для оборудования
api_router.include_router(equipment.router, prefix="/equipment", tags=["equipment"]) 