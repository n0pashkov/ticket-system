import os
import sys
import time

# Добавляем текущую директорию в PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.logging import setup_logging, get_logger
from app.core.config import settings

# Инициализируем логирование
setup_logging()
logger = get_logger("check_improvements")

def check_config():
    """Проверка конфигурации"""
    logger.info("Проверка конфигурации...")
    
    # Проверяем наличие основных настроек
    assert settings.APP_NAME, "APP_NAME должно быть задано"
    assert settings.API_V1_STR, "API_V1_STR должно быть задано"
    assert settings.SECRET_KEY, "SECRET_KEY должно быть задано"
    assert settings.DATABASE_URL, "DATABASE_URL должно быть задано"
    
    # Проверяем настройки окружения
    environment = settings.ENVIRONMENT
    cors_origins = settings.get_cors_origins(environment)
    logger.info(f"Текущее окружение: {environment}")
    logger.info(f"CORS origins: {cors_origins}")
    
    # Проверяем настройки для базы данных
    logger.info(f"Настройки соединений БД: pool_size={settings.DATABASE_POOL_SIZE}, timeout={settings.DATABASE_POOL_TIMEOUT}")
    
    return True

def check_db_connection():
    """Проверка подключения к БД"""
    from app.db.database import engine
    from sqlalchemy import text
    
    logger.info("Проверка подключения к базе данных...")
    try:
        # Проверяем соединение
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            assert result.scalar() == 1
            logger.info("Подключение к БД успешно")
        return True
    except Exception as e:
        logger.error(f"Ошибка подключения к БД: {str(e)}")
        return False

def check_models():
    """Проверка моделей данных"""
    from app.models.models import Base
    
    logger.info("Проверка моделей данных...")
    try:
        # Получаем список всех моделей
        models = Base.metadata.tables.keys()
        logger.info(f"Найдено {len(models)} моделей: {', '.join(models)}")
        return True
    except Exception as e:
        logger.error(f"Ошибка при проверке моделей: {str(e)}")
        return False

def run_checks():
    """Запуск всех проверок"""
    logger.info("Запуск проверки системы после оптимизации...")
    
    checks = [
        ("Проверка конфигурации", check_config),
        ("Проверка БД", check_db_connection),
        ("Проверка моделей", check_models),
    ]
    
    results = []
    for name, check_func in checks:
        logger.info(f"Запуск: {name}")
        start_time = time.time()
        success = check_func()
        duration = time.time() - start_time
        status = "Успешно" if success else "Ошибка"
        logger.info(f"{name}: {status} ({duration:.2f} сек)")
        results.append((name, success, duration))
    
    # Выводим сводку результатов
    logger.info("\n===== Результаты проверки =====")
    total_success = all(r[1] for r in results)
    for name, success, duration in results:
        status = "✓" if success else "✗"
        logger.info(f"{status} {name} ({duration:.2f} сек)")
    
    logger.info(f"Общий результат: {'Успешно' if total_success else 'Ошибка'}")
    return total_success

if __name__ == "__main__":
    success = run_checks()
    sys.exit(0 if success else 1) 