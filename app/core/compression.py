import gzip
from io import BytesIO
from typing import Callable, Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logging import get_logger

logger = get_logger("compression")


class GzipMiddleware(BaseHTTPMiddleware):
    """
    Middleware для сжатия ответов с помощью gzip
    
    Этот middleware проверяет, поддерживает ли клиент gzip (наличие заголовка Accept-Encoding: gzip)
    и сжимает ответ, если его размер превышает минимальный порог.
    """
    def __init__(
        self, 
        app: ASGIApp, 
        minimum_size: int = 1000,
        compression_level: int = 6,
        exclude_paths: Optional[list] = None,
        exclude_content_types: Optional[list] = None
    ):
        """
        Инициализация middleware для сжатия gzip
        
        Args:
            app: ASGI приложение
            minimum_size: Минимальный размер ответа для сжатия (в байтах)
            compression_level: Уровень сжатия gzip (1-9)
            exclude_paths: Список путей, которые не нужно сжимать
            exclude_content_types: Список типов контента, которые не нужно сжимать
        """
        super().__init__(app)
        self.minimum_size = minimum_size
        self.compression_level = compression_level
        self.exclude_paths = exclude_paths or ["/docs", "/openapi.json", "/redoc"]
        self.exclude_content_types = exclude_content_types or [
            "image/", "video/", "audio/", "application/zip", "application/gzip"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Проверяем, нужно ли исключить этот запрос из сжатия
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            return await call_next(request)
        
        # Проверяем, поддерживает ли клиент gzip
        accept_encoding = request.headers.get("Accept-Encoding", "")
        if "gzip" not in accept_encoding.lower():
            return await call_next(request)
        
        # Получаем оригинальный ответ
        response = await call_next(request)
        
        # Проверяем, не исключен ли тип контента
        content_type = response.headers.get("Content-Type", "")
        if any(content_type.startswith(excluded) for excluded in self.exclude_content_types):
            return response
        
        # Если размер ответа неизвестен или меньше минимального,
        # или контент-кодирование уже установлено, возвращаем оригинальный ответ
        if (
            "Content-Length" not in response.headers or
            int(response.headers["Content-Length"]) < self.minimum_size or
            "Content-Encoding" in response.headers
        ):
            return response
        
        # Сжимаем тело ответа
        try:
            body = b"" if response.body is None else response.body
            compressed_body = self._compress(body)
            
            # Если сжатие не дало выигрыша, возвращаем оригинальный ответ
            if len(compressed_body) >= len(body):
                return response
            
            # Создаем новый ответ со сжатым телом
            new_response = Response(
                content=compressed_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
            
            # Обновляем заголовки
            new_response.headers["Content-Encoding"] = "gzip"
            new_response.headers["Content-Length"] = str(len(compressed_body))
            new_response.headers["Vary"] = "Accept-Encoding"
            
            logger.debug(f"Compressed response from {len(body)} to {len(compressed_body)} bytes")
            return new_response
        
        except Exception as e:
            # В случае ошибки сжатия, логируем и возвращаем оригинальный ответ
            logger.error(f"Error compressing response: {str(e)}")
            return response
    
    def _compress(self, data: bytes) -> bytes:
        """
        Сжимает данные с помощью gzip
        
        Args:
            data: Исходные данные для сжатия
            
        Returns:
            Сжатые данные
        """
        buffer = BytesIO()
        with gzip.GzipFile(
            fileobj=buffer, 
            mode="wb",
            compresslevel=self.compression_level
        ) as gzip_file:
            gzip_file.write(data)
        
        return buffer.getvalue() 