import logging
import sys
from typing import Any, Dict, Optional

from app.core.config import settings

# Настройка логгера
def setup_logging() -> None:
    log_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Создаем корневой логгер
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Обработчик для вывода в консоль
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(log_formatter)
    root_logger.addHandler(console_handler)

    # Логгер для API
    api_logger = logging.getLogger("api")
    api_logger.setLevel(logging.INFO)
    
    # В режиме разработки устанавливаем уровень DEBUG
    if settings.ENVIRONMENT == "development":
        api_logger.setLevel(logging.DEBUG)
        root_logger.setLevel(logging.DEBUG)
    
    # Отключаем лишние отладочные сообщения
    configure_specific_loggers()

# Настройка уровней логирования для конкретных логгеров
def configure_specific_loggers() -> None:
    """
    Отключаем слишком подробные отладочные сообщения от определенных модулей,
    таких как aiosqlite, оставляя только важные сообщения
    """
    # Устанавливаем уровень WARNING для библиотек SQLite
    logging.getLogger("aiosqlite").setLevel(logging.WARNING)
    logging.getLogger("sqlite3").setLevel(logging.WARNING)
    
    # Устанавливаем уровень INFO для собственных модулей базы данных
    # чтобы видеть только важные сообщения, но не отладочную информацию
    logging.getLogger("async_database").setLevel(logging.INFO)
    logging.getLogger("database").setLevel(logging.INFO)
    
    # Другие модули, которые могут генерировать много логов
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)

# Получение логгера для API
def get_logger(name: str = "api") -> logging.Logger:
    return logging.getLogger(name) 