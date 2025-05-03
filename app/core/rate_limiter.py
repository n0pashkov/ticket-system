import time
from typing import Dict, Tuple, Callable, Optional
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logging import get_logger

logger = get_logger("rate_limiter")


class RateLimiter:
    """
    Простой класс для отслеживания и ограничения частоты запросов
    """
    def __init__(self, rate_limit: int, time_window: int = 60):
        """
        Инициализирует rate limiter
        
        Args:
            rate_limit: Максимальное количество запросов
            time_window: Временное окно в секундах (по умолчанию 60 секунд)
        """
        self.rate_limit = rate_limit
        self.time_window = time_window
        self.requests: Dict[str, Tuple[int, float]] = {}  # client_id -> (count, start_time)
    
    def is_rate_limited(self, client_id: str) -> Tuple[bool, Optional[int], Optional[float]]:
        """
        Проверяет, превышен ли лимит для клиента
        
        Args:
            client_id: Идентификатор клиента (обычно IP-адрес)
            
        Returns:
            Tuple из:
            - bool: превышен ли лимит
            - int или None: количество оставшихся запросов (None если превышен)
            - float или None: время до сброса лимита в секундах (None если не превышен)
        """
        current_time = time.time()
        
        # Если клиент не найден, инициализируем счетчик
        if client_id not in self.requests:
            self.requests[client_id] = (1, current_time)
            return False, self.rate_limit - 1, None
        
        count, start_time = self.requests[client_id]
        time_elapsed = current_time - start_time
        
        # Если прошло достаточно времени, сбрасываем счетчик
        if time_elapsed > self.time_window:
            self.requests[client_id] = (1, current_time)
            return False, self.rate_limit - 1, None
        
        # Если лимит превышен, возвращаем время до сброса
        if count >= self.rate_limit:
            time_remaining = self.time_window - time_elapsed
            return True, None, time_remaining
        
        # Увеличиваем счетчик
        self.requests[client_id] = (count + 1, start_time)
        return False, self.rate_limit - (count + 1), None
    
    def clear_expired(self):
        """Очищает устаревшие записи для экономии памяти"""
        current_time = time.time()
        expired_keys = []
        
        for client_id, (_, start_time) in self.requests.items():
            if current_time - start_time > self.time_window:
                expired_keys.append(client_id)
        
        for key in expired_keys:
            del self.requests[key]


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware для ограничения частоты запросов
    """
    def __init__(
        self, 
        app: ASGIApp, 
        rate_limit: int = 100,
        time_window: int = 60,
        exclude_paths: Optional[list] = None
    ):
        super().__init__(app)
        self.rate_limiter = RateLimiter(rate_limit, time_window)
        self.exclude_paths = exclude_paths or ["/docs", "/openapi.json", "/redoc", "/favicon.ico"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Пропускаем исключенные пути
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Получаем IP клиента
        client_id = request.client.host if request.client else "unknown"
        
        # Проверяем, не превышен ли лимит
        is_limited, remaining, retry_after = self.rate_limiter.is_rate_limited(client_id)
        
        if is_limited:
            logger.warning(f"Rate limit exceeded for {client_id}, retry after {retry_after:.1f} seconds")
            
            # Возвращаем ошибку 429 Too Many Requests
            return Response(
                content={"detail": "Too many requests"},
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={
                    "Retry-After": str(int(retry_after)),
                    "X-RateLimit-Limit": str(self.rate_limiter.rate_limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time() + retry_after))
                }
            )
        
        # Добавляем заголовки с информацией о лимитах
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.rate_limiter.rate_limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining) if remaining is not None else "0"
        
        # Периодически очищаем устаревшие записи
        if hash(client_id) % 10 == 0:  # Примерно в 10% случаев
            self.rate_limiter.clear_expired()
        
        return response


# Создаем экземпляры rate limiter для различных API
general_rate_limiter = RateLimiter(rate_limit=100, time_window=60)  # 100 запросов в минуту
auth_rate_limiter = RateLimiter(rate_limit=10, time_window=60)      # 10 запросов в минуту для авторизации


def limit_rate(request: Request, limiter: RateLimiter = general_rate_limiter):
    """
    Функция для ручного ограничения частоты запросов в отдельных эндпоинтах
    
    Args:
        request: Объект запроса FastAPI
        limiter: Экземпляр RateLimiter
    
    Raises:
        HTTPException: Если превышен лимит запросов
    """
    client_id = request.client.host if request.client else "unknown"
    is_limited, remaining, retry_after = limiter.is_rate_limited(client_id)
    
    if is_limited:
        logger.warning(f"Rate limit exceeded for {client_id}, retry after {retry_after:.1f} seconds")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
            headers={
                "Retry-After": str(int(retry_after)),
                "X-RateLimit-Limit": str(limiter.rate_limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(time.time() + retry_after))
            }
        ) 