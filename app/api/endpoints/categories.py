from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.core.dependencies import get_current_admin
from app.core.logging import get_logger
from app.db.async_database import get_async_db
from app.models.models import TicketCategory, User, Ticket
from app.schemas.schemas import TicketCategory as TicketCategorySchema

# Создаем модель для создания категории
class CategoryCreate(BaseModel):
    name: str
    description: str = None
    is_active: bool = True

# Модель для обновления категории
class CategoryUpdate(BaseModel):
    name: str = None
    description: str = None
    is_active: bool = None

router = APIRouter()
logger = get_logger("api.categories")


@router.get("/", response_model=List[TicketCategorySchema])
async def read_categories(
    skip: int = 0,
    limit: int = 100,
    show_all: bool = False,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка категорий заявок.
    Данные кэшируются на стороне клиента на 1 час.
    Параметр show_all=True вернет все категории, включая неактивные.
    """
    logger.debug(f"Getting categories list, show_all={show_all}")
    
    # Используем SQLAlchemy select и асинхронное выполнение
    if show_all:
        query = select(TicketCategory).offset(skip).limit(limit)
    else:
        query = select(TicketCategory).filter(TicketCategory.is_active == True).offset(skip).limit(limit)
    
    result = await db.execute(query)
    categories = result.scalars().all()
    
    # Вместо jsonable_encoder используем прямое создание словарей
    # для избежания проблем с рекурсией
    data = []
    for category in categories:
        # Преобразуем datetime в строки ISO формата
        created_at = category.created_at.isoformat() if category.created_at else None
        updated_at = category.updated_at.isoformat() if category.updated_at else None
        
        data.append({
            "id": category.id,
            "name": category.name,
            "description": category.description,
            "is_active": category.is_active,
            "created_at": created_at,
            "updated_at": updated_at
        })
    
    # Создаем JSON ответ
    response = JSONResponse(content=data)
    
    # Добавляем заголовки для кэширования этого редко меняющегося ресурса
    response.headers["Cache-Control"] = "public, max-age=10, stale-while-revalidate=5"  # Уменьшаем для тестирования
    response.headers["Vary"] = "Accept"
    
    return response


@router.get("/{category_id}", response_model=TicketCategorySchema)
async def read_category(
    category_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение категории заявки по ID.
    Данные кэшируются на стороне клиента на 1 час.
    """
    logger.debug(f"Getting category by ID: {category_id}")
    
    # Используем SQLAlchemy select и асинхронное выполнение
    query = select(TicketCategory).filter(TicketCategory.id == category_id)
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    # Преобразуем datetime в строки ISO формата для корректной сериализации
    created_at = category.created_at.isoformat() if category.created_at else None
    updated_at = category.updated_at.isoformat() if category.updated_at else None
    
    # Создаем словарь с данными категории
    data = {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "is_active": category.is_active,
        "created_at": created_at,
        "updated_at": updated_at
    }
    
    # Создаем JSON ответ
    response = JSONResponse(content=data)
    
    # Добавляем заголовки для кэширования этого редко меняющегося ресурса
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=120"  # 1 час
    response.headers["Vary"] = "Accept"
    
    return response


@router.post("/", response_model=TicketCategorySchema, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Создание новой категории заявок (только для администраторов).
    """
    logger.debug(f"Creating new category: {category_data.name}")
    
    # Проверяем, существует ли категория с таким именем
    query = select(TicketCategory).filter(TicketCategory.name == category_data.name)
    result = await db.execute(query)
    existing_category = result.scalar_one_or_none()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Категория с таким именем уже существует"
        )
    
    # Создаем новую категорию
    category = TicketCategory(
        name=category_data.name, 
        description=category_data.description,
        is_active=category_data.is_active
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
    
    logger.info(f"Category created: {category_data.name} (ID: {category.id})")
    return category


@router.put("/{category_id}", response_model=TicketCategorySchema)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Обновление категории заявок (только для администраторов).
    """
    logger.debug(f"Updating category ID: {category_id}")
    
    # Получаем категорию
    query = select(TicketCategory).filter(TicketCategory.id == category_id)
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    # Обновляем поля
    if category_data.name is not None:
        # Проверяем уникальность имени, если оно отличается от текущего
        if category_data.name != category.name:
            query = select(TicketCategory).filter(TicketCategory.name == category_data.name)
            result = await db.execute(query)
            existing_category = result.scalar_one_or_none()
            
            if existing_category:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Категория с таким именем уже существует"
                )
        category.name = category_data.name
    
    if category_data.description is not None:
        category.description = category_data.description
    
    if category_data.is_active is not None:
        category.is_active = category_data.is_active
    
    await db.commit()
    await db.refresh(category)
    
    logger.info(f"Category updated: {category.name} (ID: {category.id})")
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Удаление категории заявок (только для администраторов).
    Если категория используется в заявках, она будет помечена как неактивная.
    В противном случае категория будет полностью удалена из БД.
    """
    logger.debug(f"Deleting category ID: {category_id}")
    
    # Получаем категорию
    query = select(TicketCategory).filter(TicketCategory.id == category_id)
    result = await db.execute(query)
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    try:
        # Проверяем, используется ли категория в заявках
        tickets_query = select(Ticket).filter(Ticket.category_id == category_id)
        tickets_result = await db.execute(tickets_query)
        tickets = tickets_result.scalars().all()
        
        if tickets:
            # Если категория используется в заявках, помечаем её как неактивную
            logger.info(f"Category {category.name} (ID: {category.id}) is in use by {len(tickets)} tickets, marking as inactive")
            category.is_active = False
            await db.commit()
        else:
            # Если категория не используется, удаляем её полностью
            logger.info(f"Category {category.name} (ID: {category.id}) is not in use, deleting completely")
            await db.delete(category)
            await db.commit()
        
        # Возвращаем 204 No Content
        logger.info(f"Category operation completed: {category.name} (ID: {category.id})")
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting category: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Произошла ошибка при удалении категории: {str(e)}"
        ) 