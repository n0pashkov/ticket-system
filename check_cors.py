import os
import sys
import requests
from urllib.parse import urljoin

# Добавляем текущую директорию в PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.logging import setup_logging, get_logger

# Инициализируем логирование
setup_logging()
logger = get_logger("check_cors")

def check_cors(base_url, origin):
    """
    Проверяет настройки CORS для заданного URL и источника
    
    Args:
        base_url: Базовый URL сервера (например, http://localhost:8000)
        origin: Источник запроса (например, http://localhost:3000)
    """
    logger.info(f"Проверка CORS для {base_url} с origin: {origin}")
    
    # Формируем URL для запроса
    api_url = urljoin(base_url, "api/v1/")
    
    # Отправляем OPTIONS запрос для проверки предварительного запроса CORS
    try:
        headers = {
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type, Authorization"
        }
        
        options_response = requests.options(api_url, headers=headers)
        
        logger.info(f"OPTIONS запрос статус: {options_response.status_code}")
        logger.info(f"Заголовки ответа: {dict(options_response.headers)}")
        
        cors_success = "Access-Control-Allow-Origin" in options_response.headers
        logger.info(f"CORS настроен правильно: {cors_success}")
        
        if cors_success:
            allowed_origin = options_response.headers["Access-Control-Allow-Origin"]
            logger.info(f"Разрешенный origin: {allowed_origin}")
            if allowed_origin != "*" and allowed_origin != origin:
                logger.warning(f"Внимание! Разрешенный origin ({allowed_origin}) не соответствует запрошенному ({origin})")
        
        return cors_success
    
    except Exception as e:
        logger.error(f"Ошибка при проверке CORS: {str(e)}")
        return False

if __name__ == "__main__":
    # URL нашего API сервера
    backend_url = "http://localhost:8000/"
    
    # Список источников для проверки
    origins_to_check = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "http://example.com"  # Этот не должен быть разрешен
    ]
    
    # Проверяем CORS для каждого источника
    for origin in origins_to_check:
        result = check_cors(backend_url, origin)
        print(f"CORS для {origin}: {'✓' if result else '✗'}")
        print("----------------------------") 