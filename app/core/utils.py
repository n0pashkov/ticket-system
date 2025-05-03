from typing import Dict, Any, Optional, List, Type, TypeVar
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.logging import get_logger

logger = get_logger("utils")

T = TypeVar('T')


def handle_db_operation(operation_name: str, function: callable, *args, **kwargs):
    """
    Обертка для безопасного выполнения операций с базой данных
    
    Args:
        operation_name: Название операции для логов
        function: Функция для выполнения
        args: Аргументы для функции
        kwargs: Именованные аргументы для функции
    
    Returns:
        Результат выполнения функции
    
    Raises:
        HTTPException: При ошибках базы данных
    """
    try:
        return function(*args, **kwargs)
    except SQLAlchemyError as e:
        logger.error(f"Database error during {operation_name}: {str(e)}")
        if "db" in kwargs:
            kwargs["db"].rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка базы данных: {operation_name}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during {operation_name}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {operation_name}"
        )


def get_object_or_404(
    db: Session, 
    model: Type[T], 
    id: int, 
    message: str = "Объект не найден",
    filter_conditions: Any = None
) -> T:
    """
    Получает объект по ID или выбрасывает 404 ошибку
    
    Args:
        db: Сессия базы данных
        model: Модель SQLAlchemy
        id: ID объекта
        message: Сообщение об ошибке
        filter_conditions: Дополнительные условия фильтрации
    
    Returns:
        Найденный объект
        
    Raises:
        HTTPException: Если объект не найден
    """
    query = db.query(model).filter(model.id == id)
    
    if filter_conditions:
        query = query.filter(filter_conditions)
        
    obj = query.first()
    
    if not obj:
        logger.warning(f"{model.__name__} with ID {id} not found")
        raise HTTPException(status_code=404, detail=message)
    
    return obj


def format_response_message(success: bool, message: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Форматирует стандартный ответ API
    
    Args:
        success: Успешность операции
        message: Сообщение
        data: Данные для включения в ответ
        
    Returns:
        Отформатированный ответ
    """
    response = {
        "success": success,
        "message": message
    }
    
    if data:
        response["data"] = data
        
    return response 