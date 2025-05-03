import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.api import api_router
from app.api.endpoints.async_tickets import router as async_tickets_router
from app.core.config import settings
from app.core.logging import setup_logging, get_logger
from app.core.rate_limiter import RateLimitMiddleware
from app.db.database import engine
from app.models import models

# Инициализируем логирование
setup_logging()
logger = get_logger("main")

# Создаем все таблицы в базе данных
models.Base.metadata.create_all(bind=engine)

# Определяем окружение
environment = os.getenv("ENVIRONMENT", "development")
logger.info(f"Starting application in {environment} mode")

# Создаем экземпляр приложения FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs" if environment == "development" else None,  # Отключаем Swagger в продакшене
    redoc_url="/redoc" if environment == "development" else None,  # Отключаем ReDoc в продакшене
)

# Получаем CORS настройки в зависимости от окружения
cors_origins = settings.get_cors_origins(environment)
logger.info(f"CORS origins: {cors_origins}")

# Настройка CORS - важно для работы с фронтендом
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Type", "Authorization", "Content-Length"],
)

# Добавляем middleware для ограничения частоты запросов
app.add_middleware(
    RateLimitMiddleware,
    rate_limit=300,  # 300 запросов в минуту (можно настроить через env)
    time_window=60,
)

# Middleware для отладки запросов и добавления CORS заголовков
@app.middleware("http")
async def debug_requests(request: Request, call_next):
    try:
        # Логируем детали запроса для отладки
        origin = request.headers.get("origin", "Unknown")
        logger.debug(f"Request: {request.method} {request.url.path} from {origin}")
        
        # Выполняем запрос
        response = await call_next(request)
        
        # Логируем статус ответа
        logger.debug(f"Response: {response.status_code}")
        
        # Принудительно добавляем заголовки CORS для OPTIONS запросов
        # и при отсутствии origin в разрешенных
        if request.method == "OPTIONS" or (origin and origin not in cors_origins and "*" not in cors_origins):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            response.headers["Access-Control-Allow-Headers"] = "*"
            
        return response
    except Exception as e:
        logger.error(f"Error in request handling: {str(e)}", exc_info=True)
        error_response = JSONResponse(status_code=500, content={"detail": str(e)})
        
        # Добавляем CORS заголовки даже для ошибок
        origin = request.headers.get("origin", "*")
        error_response.headers["Access-Control-Allow-Origin"] = origin
        error_response.headers["Access-Control-Allow-Credentials"] = "true"
        
        return error_response

# Обработчики исключений
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}")
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
    
    # Добавляем CORS заголовки для ошибок
    origin = request.headers.get("origin", "*")
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error: {exc.errors()}")
    response = JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )
    
    # Добавляем CORS заголовки для ошибок валидации
    origin = request.headers.get("origin", "*")
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Монтируем директорию testui для обслуживания статических HTML-файлов
# app.mount("/testui", StaticFiles(directory="testui"), name="testui")

# Подключаем API роутер
app.include_router(api_router, prefix=settings.API_V1_STR)

# Подключаем асинхронные маршруты
app.include_router(async_tickets_router, prefix=f"{settings.API_V1_STR}/tickets")


@app.get("/")
def read_root():
    return {"message": "Добро пожаловать в систему заявок на ремонт техники"}


@app.get("/health")
async def health_check():
    """Эндпоинт для проверки работоспособности сервиса"""
    return {"status": "ok", "version": "1.0.0", "environment": environment}


# Запуск приложения (для отладки)
if __name__ == "__main__":
    # Добавлен маркер для тестирования
    # Не удаляйте этот комментарий - он нужен для тестирования
    import uvicorn
    # В тестах мы подменяем этот вызов
    uvicorn.run(app, host="0.0.0.0", port=8000) 