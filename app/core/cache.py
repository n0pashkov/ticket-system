import time
import asyncio
from typing import Dict, Any, Optional, Callable, TypeVar, Generic
from threading import RLock
from functools import wraps

from app.core.logging import get_logger

logger = get_logger("cache")

T = TypeVar('T')


class Cache:
    """
    Простой кэш в памяти с поддержкой TTL
    """
    def __init__(self, ttl: int = 300):
        """
        Инициализирует кэш
        
        Args:
            ttl: Время жизни элементов кэша в секундах (по умолчанию 5 минут)
        """
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = ttl
        self.lock = RLock()  # Для потокобезопасного доступа
        
    def get(self, key: str) -> Optional[Any]:
        """
        Получает значение из кэша
        
        Args:
            key: Ключ для поиска
            
        Returns:
            Значение из кэша или None, если ключ не найден или устарел
        """
        with self.lock:
            if key not in self.cache:
                return None
            
            entry = self.cache[key]
            # Проверяем не устарело ли значение
            if time.time() - entry["timestamp"] > self.ttl:
                logger.debug(f"Cache entry expired: {key}")
                del self.cache[key]
                return None
                
            logger.debug(f"Cache hit: {key}")
            return entry["value"]
    
    def set(self, key: str, value: Any) -> None:
        """
        Сохраняет значение в кэше
        
        Args:
            key: Ключ
            value: Значение для сохранения
        """
        with self.lock:
            logger.debug(f"Cache set: {key}")
            self.cache[key] = {
                "value": value,
                "timestamp": time.time()
            }
    
    def delete(self, key: str) -> None:
        """
        Удаляет значение из кэша
        
        Args:
            key: Ключ для удаления
        """
        with self.lock:
            if key in self.cache:
                logger.debug(f"Cache delete: {key}")
                del self.cache[key]
    
    def clear(self) -> None:
        """Очищает весь кэш"""
        with self.lock:
            logger.debug("Cache cleared")
            self.cache.clear()
            
    def invalidate_by_prefix(self, prefix: str) -> None:
        """
        Инвалидирует все ключи, начинающиеся с указанного префикса
        
        Args:
            prefix: Префикс ключей для инвалидации
        """
        with self.lock:
            keys_to_delete = [k for k in self.cache.keys() if k.startswith(prefix)]
            for key in keys_to_delete:
                logger.debug(f"Cache invalidate by prefix: {key}")
                del self.cache[key]


# Создаем экземпляр кэша с TTL 5 минут
global_cache = Cache(ttl=300)


def cache_result(prefix: str = "", ttl: Optional[int] = None):
    """
    Декоратор для кэширования результатов функций с поддержкой как синхронных,
    так и асинхронных функций.
    
    Args:
        prefix: Префикс для кэш-ключа
        ttl: Время жизни кэша для этой функции (переопределяет глобальное)
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Создаем ключ на основе аргументов функции
            key_parts = [prefix, func.__name__]
            
            # Добавляем аргументы в ключ
            for arg in args:
                key_parts.append(str(arg))
            
            # Добавляем именованные аргументы в ключ, сортируем для стабильности
            for k in sorted(kwargs.keys()):
                key_parts.append(f"{k}={kwargs[k]}")
            
            # Формируем финальный ключ
            cache_key = ":".join(key_parts)
            
            # Пытаемся получить результат из кэша
            result = global_cache.get(cache_key)
            if result is not None:
                return result
            
            # Если кэш промах, вызываем оригинальную функцию
            result = await func(*args, **kwargs)
            
            # Сохраняем результат в кэше
            if ttl is not None:
                # Временно изменяем TTL для этого ключа
                old_ttl = global_cache.ttl
                global_cache.ttl = ttl
                global_cache.set(cache_key, result)
                global_cache.ttl = old_ttl
            else:
                global_cache.set(cache_key, result)
                
            return result
            
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Создаем ключ на основе аргументов функции
            key_parts = [prefix, func.__name__]
            
            # Добавляем аргументы в ключ
            for arg in args:
                key_parts.append(str(arg))
            
            # Добавляем именованные аргументы в ключ, сортируем для стабильности
            for k in sorted(kwargs.keys()):
                key_parts.append(f"{k}={kwargs[k]}")
            
            # Формируем финальный ключ
            cache_key = ":".join(key_parts)
            
            # Пытаемся получить результат из кэша
            result = global_cache.get(cache_key)
            if result is not None:
                return result
            
            # Если кэш промах, вызываем оригинальную функцию
            result = func(*args, **kwargs)
            
            # Сохраняем результат в кэше
            if ttl is not None:
                # Временно изменяем TTL для этого ключа
                old_ttl = global_cache.ttl
                global_cache.ttl = ttl
                global_cache.set(cache_key, result)
                global_cache.ttl = old_ttl
            else:
                global_cache.set(cache_key, result)
                
            return result
            
        # Выбираем нужный враппер в зависимости от типа функции
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
            
    return decorator 