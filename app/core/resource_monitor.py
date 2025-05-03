import os
import platform
import psutil
import time
from typing import Dict, Any, Optional
from threading import Thread

from app.core.logging import get_logger

logger = get_logger("resource_monitor")


class ResourceMonitor:
    """
    Класс для мониторинга ресурсов системы:
    - CPU
    - Память
    - Диск
    - Сеть
    """
    def __init__(self, interval: int = 60):
        """
        Инициализирует монитор ресурсов
        
        Args:
            interval: Интервал сбора метрик в секундах
        """
        self.interval = interval
        self.current_metrics: Dict[str, Any] = {}
        self._monitor_thread: Optional[Thread] = None
        self._running = False
    
    def start(self):
        """Запускает сбор метрик в отдельном потоке"""
        if self._running:
            logger.warning("ResourceMonitor is already running")
            return
        
        self._running = True
        self._monitor_thread = Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        logger.info("ResourceMonitor started")
    
    def stop(self):
        """Останавливает сбор метрик"""
        self._running = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=5)
            logger.info("ResourceMonitor stopped")
    
    def _monitor_loop(self):
        """Основной цикл сбора метрик"""
        while self._running:
            try:
                self.current_metrics = self.collect_metrics()
                logger.debug(f"Collected metrics: CPU={self.current_metrics['cpu_percent']}%, "
                            f"Memory={self.current_metrics['memory_percent']}%")
            except Exception as e:
                logger.error(f"Error collecting metrics: {str(e)}")
            
            # Ждем до следующего сбора
            time.sleep(self.interval)
    
    def collect_metrics(self) -> Dict[str, Any]:
        """
        Собирает текущие метрики ресурсов
        
        Returns:
            Словарь с метриками
        """
        metrics = {
            "timestamp": time.time(),
            "system": {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "processors": psutil.cpu_count(logical=True)
            }
        }
        
        # CPU метрики
        cpu_metrics = self._get_cpu_metrics()
        metrics.update(cpu_metrics)
        
        # Память
        memory_metrics = self._get_memory_metrics()
        metrics.update(memory_metrics)
        
        # Диск
        disk_metrics = self._get_disk_metrics()
        metrics.update(disk_metrics)
        
        # Сеть (опционально)
        # network_metrics = self._get_network_metrics()
        # metrics.update(network_metrics)
        
        return metrics
    
    def _get_cpu_metrics(self) -> Dict[str, Any]:
        """Собирает метрики CPU"""
        return {
            "cpu_percent": psutil.cpu_percent(interval=1),
            "cpu_count": psutil.cpu_count(),
            "cpu_stats": {
                "ctx_switches": psutil.cpu_stats().ctx_switches,
                "interrupts": psutil.cpu_stats().interrupts,
            }
        }
    
    def _get_memory_metrics(self) -> Dict[str, Any]:
        """Собирает метрики памяти"""
        memory = psutil.virtual_memory()
        return {
            "memory_total": memory.total,
            "memory_available": memory.available,
            "memory_used": memory.used,
            "memory_percent": memory.percent
        }
    
    def _get_disk_metrics(self) -> Dict[str, Any]:
        """Собирает метрики дисков"""
        # Получаем текущую директорию приложения
        app_path = os.path.abspath(os.path.dirname(__file__))
        disk_usage = psutil.disk_usage(app_path)
        
        return {
            "disk_path": app_path,
            "disk_total": disk_usage.total,
            "disk_used": disk_usage.used,
            "disk_free": disk_usage.free,
            "disk_percent": disk_usage.percent
        }
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """
        Возвращает последние собранные метрики
        
        Returns:
            Словарь с метриками или пустой словарь, если метрики еще не собраны
        """
        return self.current_metrics


# Создаем глобальный экземпляр монитора ресурсов
resource_monitor = ResourceMonitor(interval=60)


def get_system_stats() -> Dict[str, Any]:
    """
    Получает основные метрики системы для API эндпоинта
    
    Returns:
        Словарь с метриками системы
    """
    if not resource_monitor.current_metrics:
        return resource_monitor.collect_metrics()
    return resource_monitor.current_metrics 