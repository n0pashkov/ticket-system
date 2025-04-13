import os
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
    
    # Настройки безопасности
    SECRET_KEY: str = "your-secret-key-for-development-only"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Настройки CORS для разработки и продакшена
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Метод для программной настройки CORS в зависимости от среды запуска
    def get_cors_origins(self, environment: str = "development"):
        """
        Возвращает список разрешенных источников CORS в зависимости от среды запуска
        """
        if environment == "production":
            # В продакшене только конкретные домены
            return [
                "https://yourproddomain.com",
                "https://www.yourproddomain.com",
                "https://app.yourproddomain.com",
            ]
        elif environment == "staging":
            # На тестовых серверах
            return [
                "https://staging.yourproddomain.com",
                "https://test.yourproddomain.com",
            ]
        else:
            # В разработке разрешаем localhost и все остальные источники
            return ["*", "http://localhost:3000", "http://127.0.0.1:3000"]
    
    # URL базы данных
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ticket_system.db")
    
    # Параметры для подключения к базе данных
    DATABASE_PARAMS: Dict[str, Any] = {"check_same_thread": False}
    
    # Токен для Telegram бота
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")

    # Конфигурация настроек
    model_config = SettingsConfigDict(case_sensitive=True)


# Создаем экземпляр настроек
settings = Settings() 