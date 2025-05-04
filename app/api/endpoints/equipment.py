from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
import logging

from app.db.database import get_db
from app.models.models import Equipment, User, UserRole, Maintenance, EquipmentStatus, TicketCategory
from app.core.security import get_current_active_user
from app.core.dependencies import get_current_agent_or_admin
from app.schemas.schemas import Equipment as EquipmentSchema
from app.schemas.schemas import EquipmentCreate, EquipmentUpdate
from app.schemas.schemas import Maintenance as MaintenanceSchema
from app.schemas.schemas import MaintenanceCreate

router = APIRouter()


@router.get("/", response_model=List[EquipmentSchema])
def get_equipment_list(
    skip: int = 0,
    limit: int = 100,
    type: Optional[str] = None,
    category: Optional[str] = None,
    category_id: Optional[int] = None,
    location: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка оборудования с возможностью фильтрации
    
    - type: тип оборудования 
    - category: альтернативное название для type
    - category_id: ID категории (если указан, ищем оборудование по типу, соответствующему категории)
    - location: местоположение
    - status: статус оборудования
    """
    logger = logging.getLogger("app.api.equipment")
    
    logger.info(f"Запрос оборудования с параметрами: type={type}, category={category}, category_id={category_id}, location={location}, status={status}")
    
    query = db.query(Equipment)
    
    # Если указан category_id, получаем название категории и фильтруем по нему
    if category_id:
        category_query = db.query(TicketCategory).filter(TicketCategory.id == category_id).first()
        if category_query:
            category_name = category_query.name
            logger.info(f"Найдена категория {category_id}: {category_name}")
            query = query.filter(Equipment.type == category_name)
        else:
            logger.warning(f"Категория с ID {category_id} не найдена")
    # Иначе применяем стандартные фильтры
    elif type:
        logger.info(f"Фильтрация по типу: {type}")
        query = query.filter(Equipment.type == type)
    elif category:  # Используем category как альтернативу type
        logger.info(f"Фильтрация по категории: {category}")
        query = query.filter(Equipment.type == category)
    
    if location:
        logger.info(f"Фильтрация по местоположению: {location}")
        query = query.filter(Equipment.location == location)
    if status:
        logger.info(f"Фильтрация по статусу: {status}")
        query = query.filter(Equipment.status == status)
    
    equipment = query.offset(skip).limit(limit).all()
    logger.info(f"Найдено оборудования: {len(equipment)}")
    for item in equipment:
        logger.info(f"Оборудование: ID={item.id}, Название={item.name}, Тип={item.type}")
    
    return equipment


@router.get("/categories", response_model=List[str], status_code=status.HTTP_200_OK)
def get_equipment_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка категорий оборудования
    """
    # Извлекаем уникальные категории из базы данных
    categories = db.query(Equipment.type).distinct().all()
    result = [category[0] for category in categories if category[0]]
    
    # Добавляем стандартные категории, если их нет в базе
    standard_categories = ["computer", "printer", "monitor", "projector"]
    for category in standard_categories:
        if category not in result:
            result.append(category)
    
    return result


@router.get("/locations", response_model=List[str], status_code=status.HTTP_200_OK)
def get_equipment_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка местоположений оборудования
    """
    # Извлекаем уникальные местоположения из базы данных
    locations = db.query(Equipment.location).distinct().all()
    result = [location[0] for location in locations if location[0]]
    
    # Добавляем стандартные местоположения, если их нет в базе
    standard_locations = ["Офис 101", "Офис 102"]
    for location in standard_locations:
        if location not in result:
            result.append(location)
    
    return result


@router.get("/{equipment_id}", response_model=EquipmentSchema)
def get_equipment_details(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение детальной информации об оборудовании
    """
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Оборудование не найдено")
    return equipment


@router.post("/", response_model=EquipmentSchema, status_code=status.HTTP_201_CREATED)
def create_equipment(
    equipment_data: EquipmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_or_admin)
):
    """
    Создание новой записи об оборудовании (только для технических работников и администраторов)
    """
    # Преобразуем данные в словарь
    equipment_dict = equipment_data.model_dump()
    
    # Преобразуем category в type, если она указана в запросе
    if 'category' in equipment_dict and equipment_dict['category']:
        equipment_dict['type'] = equipment_dict.pop('category')
    elif 'type' not in equipment_dict or not equipment_dict['type']:
        # Если ни type, ни category не указаны, возвращаем ошибку
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Необходимо указать тип оборудования (type или category)"
        )
    
    # Удаляем поля, которых нет в модели
    if 'maintenance_type' in equipment_dict:
        equipment_dict.pop('maintenance_type')
    if 'date' in equipment_dict:
        equipment_dict.pop('date')
    
    db_equipment = Equipment(
        **equipment_dict,
        created_by_id=current_user.id
    )
    db.add(db_equipment)
    db.commit()
    db.refresh(db_equipment)
    return db_equipment


@router.put("/{equipment_id}", response_model=EquipmentSchema)
def update_equipment(
    equipment_id: int,
    equipment_data: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_or_admin)
):
    """
    Обновление информации об оборудовании (только для технических работников и администраторов)
    """
    db_equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Оборудование не найдено")
    
    # Обновляем указанные поля
    equipment_dict = equipment_data.model_dump(exclude_unset=True)
    
    # Преобразуем category в type, если она указана в запросе
    if 'category' in equipment_dict and equipment_dict['category']:
        equipment_dict['type'] = equipment_dict.pop('category')
    
    # Удаляем поля, которых нет в модели
    if 'maintenance_type' in equipment_dict:
        equipment_dict.pop('maintenance_type')
    if 'date' in equipment_dict:
        equipment_dict.pop('date')
    
    for key, value in equipment_dict.items():
        setattr(db_equipment, key, value)
    
    # Обновляем информацию о редактировании
    db_equipment.updated_by_id = current_user.id
    db_equipment.updated_at = datetime.now()
    
    db.commit()
    db.refresh(db_equipment)
    return db_equipment


@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Удаление записи об оборудовании (только для администраторов)
    """
    # Проверяем, что пользователь является администратором
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только администраторы могут удалять оборудование"
        )
    
    db_equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not db_equipment:
        raise HTTPException(status_code=404, detail="Оборудование не найдено")
    
    db.delete(db_equipment)
    db.commit()
    return None


@router.get("/{equipment_id}/history", response_model=List[MaintenanceSchema])
def get_equipment_history(
    equipment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение истории обслуживания оборудования
    """
    # Проверяем, существует ли оборудование
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Оборудование не найдено")
    
    # Получаем историю обслуживания
    maintenance_records = db.query(Maintenance).filter(Maintenance.equipment_id == equipment_id).all()
    return maintenance_records


@router.post("/{equipment_id}/maintenance", response_model=MaintenanceSchema, status_code=status.HTTP_201_CREATED)
def add_maintenance_record(
    equipment_id: int,
    maintenance_data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_agent_or_admin)
):
    """
    Добавление записи о техническом обслуживании оборудования
    (только для технических работников и администраторов)
    """
    # Проверяем, существует ли оборудование
    equipment = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not equipment:
        raise HTTPException(status_code=404, detail="Оборудование не найдено")
    
    # Преобразуем данные в словарь
    maintenance_dict = maintenance_data.model_dump()
    
    # Преобразуем maintenance_type в action_type, если она указана в запросе
    if 'maintenance_type' in maintenance_dict and maintenance_dict['maintenance_type']:
        maintenance_dict['action_type'] = maintenance_dict.pop('maintenance_type')
    elif 'action_type' not in maintenance_dict or not maintenance_dict['action_type']:
        # Если ни action_type, ни maintenance_type не указаны, возвращаем ошибку
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Необходимо указать тип обслуживания (maintenance_type или action_type)"
        )
    
    # Преобразуем date в performed_at, если она указана в запросе
    if 'date' in maintenance_dict and maintenance_dict['date']:
        date_str = maintenance_dict.pop('date')
        try:
            # Пробуем преобразовать строку в объект datetime
            maintenance_dict['performed_at'] = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            # Если формат неверный, возвращаем ошибку
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Неверный формат даты. Используйте формат YYYY-MM-DD"
            )
    
    # Устанавливаем equipment_id из URL
    maintenance_dict['equipment_id'] = equipment_id
    
    # Создаем запись об обслуживании
    new_maintenance = Maintenance(
        performed_by=current_user.id,
        **maintenance_dict
    )
    
    db.add(new_maintenance)
    db.commit()
    db.refresh(new_maintenance)
    
    # Создаем словарь с нужными полями для ответа
    result = {
        "id": new_maintenance.id,
        "equipment_id": new_maintenance.equipment_id,
        "action_type": new_maintenance.action_type,
        "description": new_maintenance.description,
        "performed_by": new_maintenance.performed_by,
        "performed_at": new_maintenance.performed_at,
        "maintenance_type": new_maintenance.action_type  # Добавляем поле maintenance_type
    }
    
    return result


@router.get("/debug/by-category/{category_id}", response_model=List[EquipmentSchema])
def get_equipment_by_category_debug(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Отладочный эндпоинт для получения оборудования по ID категории
    """
    logger = logging.getLogger("app.api.equipment")
    
    logger.info(f"Отладочный запрос оборудования по category_id={category_id}")
    
    # Получаем категорию
    category = db.query(TicketCategory).filter(TicketCategory.id == category_id).first()
    
    if not category:
        logger.warning(f"Категория с ID {category_id} не найдена")
        return []
    
    logger.info(f"Найдена категория ID={category.id}, название={category.name}")
    
    # Получаем оборудование по категории (типу)
    equipment = db.query(Equipment).filter(Equipment.type == category.name).all()
    
    logger.info(f"Найдено оборудования: {len(equipment)}")
    for item in equipment:
        logger.info(f"Оборудование: ID={item.id}, Name={item.name}, Type={item.type}")
    
    # Проверяем все оборудование
    all_equipment = db.query(Equipment).all()
    logger.info(f"Всего оборудования в БД: {len(all_equipment)}")
    logger.info("Типы оборудования в БД:")
    for type_name in set(item.type for item in all_equipment if item.type):
        logger.info(f"- {type_name}")
    
    return equipment 