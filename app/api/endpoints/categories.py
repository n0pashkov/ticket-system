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
from app.models.models import TicketCategory, User
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
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка категорий заявок.
    Данные кэшируются на стороне клиента на 1 час.
    """
    logger.debug("Getting categories list")
    
    # Используем SQLAlchemy select и асинхронное выполнение
    query = select(TicketCategory).filter(TicketCategory.is_active == True).offset(skip).limit(limit)
    result = await db.execute(query)
    categories = result.scalars().all()
    
    # Преобразуем объекты в JSON-совместимый формат
    data = jsonable_encoder(categories)
    
    # Создаем JSON ответ
    response = JSONResponse(content=data)
    
    # Добавляем заголовки для кэширования этого редко меняющегося ресурса
    response.headers["Cache-Control"] = "public, max-age=3600, stale-while-revalidate=120"  # 1 час
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
    
    # Преобразуем объект в JSON-совместимый формат
    data = jsonable_encoder(category)
    
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