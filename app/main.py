import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.api.api import api_router
from app.core.config import settings
from app.db.database import engine
from app.models import models

# Создаем все таблицы в базе данных
models.Base.metadata.create_all(bind=engine)

# Определяем окружение
environment = os.getenv("ENVIRONMENT", "development")

# Создаем экземпляр приложения FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Явно указываем разрешенные CORS-источники
CORS_ORIGINS = ["*", "http://localhost:3000", "http://127.0.0.1:3000"]

# Настройка CORS в зависимости от окружения - используем более широкие настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все источники
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Middleware для отладки ошибок сервера
@app.middleware("http")
async def debug_requests(request: Request, call_next):
    try:
        print(f"Request: {request.method} {request.url.path} from {request.headers.get('origin')}")
        response = await call_next(request)
        print(f"Response: {response.status_code}")
        # Добавляем CORS заголовки для всех ответов
        response.headers["Access-Control-Allow-Origin"] = "*"
        return response
    except Exception as e:
        print(f"Error: {str(e)}")
        # В случае ошибки тоже добавляем CORS заголовки
        error_response = JSONResponse(status_code=500, content={"detail": str(e)})
        error_response.headers["Access-Control-Allow-Origin"] = "*"
        return error_response

# Монтируем директорию testui для обслуживания статических HTML-файлов
# app.mount("/testui", StaticFiles(directory="testui"), name="testui")

# Подключаем API роутер
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def read_root():
    return {"message": "Добро пожаловать в систему заявок на ремонт техники"}


# Запуск приложения (для отладки)
if __name__ == "__main__":
    # Добавлен маркер для тестирования
    # Не удаляйте этот комментарий - он нужен для тестирования
    import uvicorn
    # В тестах мы подменяем этот вызов
    uvicorn.run(app, host="0.0.0.0", port=8000) 