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

# Получение логгера для API
def get_logger(name: str = "api") -> logging.Logger:
    return logging.getLogger(name) 