from fastapi import APIRouter

from app.api.endpoints import auth, users, tickets, comments

# Создаем основной API роутер
api_router = APIRouter()

# Подключаем эндпоинты для аутентификации
api_router.include_router(auth.router, prefix="", tags=["authentication"])

# Подключаем эндпоинты для пользователей
api_router.include_router(users.router, prefix="/users", tags=["users"])

# Подключаем эндпоинты для заявок
api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])

# Подключаем эндпоинты для комментариев
api_router.include_router(comments.router, prefix="/comments", tags=["comments"]) 