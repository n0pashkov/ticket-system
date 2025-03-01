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
    APP_NAME: str = "Система заявок на ремонт"
    
    # Базовый URL API
    API_V1_STR: str = "/api/v1"
    
    # Секретный ключ для JWT токенов
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-keep-it-secret")
    
    # Алгоритм для JWT
    ALGORITHM: str = "HS256"
    
    # Время жизни токена (в минутах)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # URL базы данных
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ticket_system.db")
    
    # Параметры для подключения к базе данных
    DATABASE_PARAMS: Dict[str, Any] = {"check_same_thread": False}
    
    # Настройки для CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]

    # Конфигурация настроек
    model_config = SettingsConfigDict(case_sensitive=True)


# Создаем экземпляр настроек
settings = Settings() 