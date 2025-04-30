from fastapi import APIRouter

from app.api.endpoints import auth, users, tickets, statistics, notifications, attachments, equipment, categories

# Создаем основной API роутер
api_router = APIRouter()

# Подключаем эндпоинты для аутентификации
print(">>> DEBUG: Registering auth router")
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Подключаем эндпоинты для пользователей
print(">>> DEBUG: Registering users router")
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Подключаем эндпоинты для заявок
print(">>> DEBUG: Registering tickets router")
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])

# Подключаем эндпоинты для статистики и отчетности
print(">>> DEBUG: Registering statistics router")
api_router.include_router(statistics.router, prefix="/statistics", tags=["statistics"])

# Подключаем эндпоинты для уведомлений
print(">>> DEBUG: Registering notifications router")
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])

# Подключаем эндпоинты для вложений
print(">>> DEBUG: Registering attachments router")
api_router.include_router(attachments.router, prefix="/attachments", tags=["attachments"])

# Подключаем эндпоинты для оборудования
print(">>> DEBUG: Registering equipment router")
api_router.include_router(equipment.router, prefix="/equipment", tags=["equipment"])

# Подключаем эндпоинты для категорий заявок
print(">>> DEBUG: Registering categories router")
api_router.include_router(categories.router, prefix="/categories", tags=["categories"]) 