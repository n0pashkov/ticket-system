from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.models.models import TicketCategory, User, UserRole
from app.schemas.schemas import TicketCategory as TicketCategorySchema
from app.schemas.schemas import TicketCategoryCreate, TicketCategoryUpdate
from app.core.security import get_current_active_user
from app.core.dependencies import get_current_admin

router = APIRouter()


# Получение списка всех категорий
@router.get("/", response_model=List[TicketCategorySchema])
def read_categories(
    skip: int = 0,
    limit: int = 100,
    only_active: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получить список всех категорий заявок.
    """
    query = db.query(TicketCategory)
    
    # Фильтруем только активные категории, если установлен флаг
    if only_active:
        query = query.filter(TicketCategory.is_active == True)
    
    categories = query.offset(skip).limit(limit).all()
    return categories


# Получение конкретной категории по ID
@router.get("/{category_id}", response_model=TicketCategorySchema)
def read_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получить категорию заявки по ID.
    """
    category = db.query(TicketCategory).filter(TicketCategory.id == category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return category


# Создание новой категории (только для администраторов)
@router.post("/", response_model=TicketCategorySchema, status_code=status.HTTP_201_CREATED)
def create_category(
    category: TicketCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Создать новую категорию заявок (только для администраторов).
    """
    # Проверяем, существует ли категория с таким именем
    existing_category = db.query(TicketCategory).filter(
        func.lower(TicketCategory.name) == func.lower(category.name)
    ).first()
    
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Категория с таким именем уже существует"
        )
    
    # Создаем новую категорию
    db_category = TicketCategory(
        name=category.name,
        description=category.description,
        is_active=category.is_active
    )
    
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    
    return db_category


# Обновление категории (только для администраторов)
@router.put("/{category_id}", response_model=TicketCategorySchema)
def update_category(
    category_id: int,
    category_update: TicketCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Обновить существующую категорию заявок (только для администраторов).
    """
    # Получаем категорию из БД
    db_category = db.query(TicketCategory).filter(TicketCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    # Если обновляется имя, проверяем, что нет дубликатов
    if category_update.name is not None and db_category.name != category_update.name:
        existing_category = db.query(TicketCategory).filter(
            func.lower(TicketCategory.name) == func.lower(category_update.name)
        ).first()
        
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Категория с таким именем уже существует"
            )
    
    # Обновляем поля категории
    update_data = category_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_category, key, value)
    
    db.commit()
    db.refresh(db_category)
    
    return db_category


# Удаление категории (только для администраторов)
@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """
    Удалить категорию заявок (только для администраторов).
    """
    # Получаем категорию из БД
    db_category = db.query(TicketCategory).filter(TicketCategory.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    
    # Проверяем, есть ли связанные заявки
    if db_category.tickets:
        # Делаем категорию неактивной вместо удаления
        db_category.is_active = False
        db.commit()
    else:
        # Если нет связанных заявок, удаляем категорию
        db.delete(db_category)
        db.commit()
    
    return None 