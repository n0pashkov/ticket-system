from typing import Callable, Dict, List, Optional, Union
from datetime import timedelta

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logging import get_logger

logger = get_logger("http_cache")


class HTTPCacheMiddleware(BaseHTTPMiddleware):
    """
    Middleware для добавления HTTP-заголовков кэширования в ответы.
    
    Это позволяет клиентам (браузерам, мобильным приложениям) кэшировать ответы
    и не делать повторных запросов, что снижает нагрузку на сервер.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        cache_control_by_path: Optional[Dict[str, Dict[str, Union[str, int]]]] = None,
        cache_paths_regex: Optional[List[str]] = None,
        default_max_age: int = 60,  # 1 минута по умолчанию
        exclude_paths: Optional[List[str]] = None
    ):
        """
        Инициализация middleware для HTTP-кэширования
        
        Args:
            app: ASGI приложение
            cache_control_by_path: Словарь с настройками Cache-Control для конкретных путей
            cache_paths_regex: Список регулярных выражений для путей, которые нужно кэшировать
            default_max_age: Время кэширования по умолчанию (в секундах)
            exclude_paths: Список путей, которые не нужно кэшировать
        """
        super().__init__(app)
        self.cache_control_by_path = cache_control_by_path or {}
        self.default_max_age = default_max_age
        self.exclude_paths = exclude_paths or [
            "/api/v1/auth",
            "/api/v1/users/me",
            # Все действия с заявками (изменение статуса, назначение, создание)
            "/api/v1/tickets/",  # Базовый путь для работы с заявками
            "/api/v1/tickets/assign",  # Назначение заявки
            "/api/v1/tickets/status",  # Изменение статуса
            "/api/v1/tickets/close"  # Закрытие заявки
        ]
        
        # Пути, которые не изменяются и могут кэшироваться дольше
        self.static_paths = [
            # Статические файлы и документация
            "/docs", "/redoc", "/static", "/favicon.ico",
            # Статичные эндпоинты API
            "/api/v1/categories"
        ]
        
        # Пути для данных, которые изменяются редко
        self.semi_static_paths = [
            "/api/v1/equipment",
            "/api/v1/tickets/categories"
        ]
        
        # Специальные настройки для кэширования метрик и статистики
        self.statistics_paths = [
            "/api/v1/statistics/tickets-summary",
            "/api/v1/statistics/agent-performance",
            "/api/v1/statistics/tickets-by-period",
            "/api/v1/statistics/user-activity"
        ]
        
        # Кэширование мониторинга
        self.monitoring_paths = [
            "/api/v1/monitoring/system",
            "/api/v1/monitoring/database"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Пропускаем пути, которые не нужно кэшировать
        if self._should_skip_cache(request):
            return await call_next(request)
        
        # Получаем оригинальный ответ
        response = await call_next(request)
        
        # Добавляем заголовки кэширования только для GET-запросов с успешным ответом
        if request.method == "GET" and 200 <= response.status_code < 300:
            self._add_cache_headers(request, response)
        else:
            # Для других методов и статусов запрещаем кэширование
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
        
        return response
    
    def _should_skip_cache(self, request: Request) -> bool:
        """Проверяет, нужно ли пропустить кэширование для этого запроса"""
        # Пропускаем запросы с методами, отличными от GET
        if request.method != "GET":
            return True
        
        # Пропускаем запросы, содержащие заголовок Cache-Control: no-cache
        cache_control = request.headers.get("Cache-Control", "")
        if "no-cache" in cache_control or "no-store" in cache_control:
            return True
        
        # Пропускаем исключенные пути
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return True
        
        return False
    
    def _add_cache_headers(self, request: Request, response: Response) -> None:
        """Добавляет заголовки кэширования в ответ"""
        path = request.url.path
        
        # Проверяем, есть ли для пути специальные настройки Cache-Control
        if path in self.cache_control_by_path:
            cache_settings = self.cache_control_by_path[path]
            cache_control = cache_settings.get("Cache-Control")
            if cache_control:
                response.headers["Cache-Control"] = cache_control
                logger.debug(f"Added custom Cache-Control for {path}: {cache_control}")
                return
        
        # Статические пути кэшируются дольше
        if any(path.startswith(static_path) for static_path in self.static_paths):
            max_age = 86400  # 24 часа
            response.headers["Cache-Control"] = f"public, max-age={max_age}, stale-while-revalidate=60"
            response.headers["Expires"] = self._format_expires(timedelta(seconds=max_age))
            logger.debug(f"Added Cache-Control for static path {path}: max-age={max_age}")
            return
        
        # Полустатические пути
        if any(path.startswith(semi_static) for semi_static in self.semi_static_paths):
            max_age = 3600  # 1 час
            response.headers["Cache-Control"] = f"public, max-age={max_age}, stale-while-revalidate=60"
            response.headers["Expires"] = self._format_expires(timedelta(seconds=max_age))
            logger.debug(f"Added Cache-Control for semi-static path {path}: max-age={max_age}")
            return
        
        # Пути статистики кэшируются на среднее время
        if any(path.startswith(stats_path) for stats_path in self.statistics_paths):
            max_age = 300  # 5 минут
            response.headers["Cache-Control"] = f"public, max-age={max_age}, stale-while-revalidate=60"
            response.headers["Expires"] = self._format_expires(timedelta(seconds=max_age))
            logger.debug(f"Added Cache-Control for statistics path {path}: max-age={max_age}")
            return
        
        # Пути мониторинга кэшируются на короткое время
        if any(path.startswith(monitor_path) for monitor_path in self.monitoring_paths):
            max_age = 30  # 30 секунд
            response.headers["Cache-Control"] = f"public, max-age={max_age}, stale-while-revalidate=10"
            response.headers["Expires"] = self._format_expires(timedelta(seconds=max_age))
            logger.debug(f"Added Cache-Control for monitoring path {path}: max-age={max_age}")
            return
        
        # По умолчанию кэшируем на короткое время
        response.headers["Cache-Control"] = f"public, max-age={self.default_max_age}, stale-while-revalidate=30"
        response.headers["Expires"] = self._format_expires(timedelta(seconds=self.default_max_age))
        logger.debug(f"Added default Cache-Control for {path}: max-age={self.default_max_age}")
    
    def _format_expires(self, delta: timedelta) -> str:
        """Форматирует заголовок Expires с указанным временем жизни"""
        import time
        from wsgiref.handlers import format_date_time
        
        expire_time = time.time() + delta.total_seconds()
        return format_date_time(expire_time) 