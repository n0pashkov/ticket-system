import os
import secrets
from typing import Optional, Dict, Any, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла
load_dotenv()


class Settings(BaseSettings):
    """
    Настройки приложения
    """
    # Название приложения
    APP_NAME: str = "Ticket System API"
    
    # Версия API
    API_V1_STR: str = "/api/v1"
    
    # Настройки окружения
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Настройки безопасности
    SECRET_KEY: str = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Развернутый список разрешенных источников CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "https://yourproddomain.com",
        "https://www.yourproddomain.com",
        "https://app.yourproddomain.com",
        "https://staging.yourproddomain.com",
        "https://test.yourproddomain.com",
    ]
    
    # Метод для программной настройки CORS в зависимости от среды запуска
    def get_cors_origins(self, environment: str = None):
        """
        Возвращает список разрешенных источников CORS в зависимости от среды запуска
        """
        # Локальные источники всегда разрешены для удобства разработки
        local_origins = [
            "http://localhost",
            "http://localhost:3000",
            "http://127.0.0.1",
            "http://127.0.0.1:3000"
        ]
        
        env = environment or self.ENVIRONMENT
        
        if env == "production":
            # В продакшене конкретные домены + локальные для отладки
            return local_origins + [
                "https://yourproddomain.com",
                "https://www.yourproddomain.com",
                "https://app.yourproddomain.com",
            ]
        elif env == "staging":
            # На тестовых серверах
            return local_origins + [
                "https://staging.yourproddomain.com",
                "https://test.yourproddomain.com",
            ]
        else:
            # В разработке разрешаем все источники
            return ["*"]
    
    # URL базы данных
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ticket_system.db")
    
    # Параметры для подключения к базе данных
    DATABASE_PARAMS: Dict[str, Any] = {"check_same_thread": False}
    
    # Настройки для оптимизации
    DATABASE_POOL_SIZE: int = int(os.getenv("DATABASE_POOL_SIZE", "5"))
    DATABASE_POOL_TIMEOUT: int = int(os.getenv("DATABASE_POOL_TIMEOUT", "30"))
    
    # Токен для Telegram бота
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")

    # Конфигурация настроек
    model_config = SettingsConfigDict(case_sensitive=True)


# Создаем экземпляр настроек
settings = Settings() 