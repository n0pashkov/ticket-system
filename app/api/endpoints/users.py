from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from pydantic import BaseModel

from app.core.security import get_password_hash, get_current_active_user, verify_password
from app.core.dependencies import get_current_admin
from app.db.async_database import get_async_db
from app.models.models import User, UserRole
from app.schemas.schemas import User as UserSchema
from app.schemas.schemas import UserCreate, UserUpdate, UserMe

router = APIRouter()

# Новая модель для смены пароля
class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# Регистрация нового пользователя (доступно только администраторам)
@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    # Проверяем, существует ли пользователь с таким email
    if user.email:
        query = select(User).filter(User.email == user.email)
        result = await db.execute(query)
        db_user_email = result.scalar_one_or_none()
        
        if db_user_email:
            raise HTTPException(
                status_code=400,
                detail="Email уже зарегистрирован в системе"
            )
    
    # Проверяем, существует ли пользователь с таким username
    query = select(User).filter(User.username == user.username)
    result = await db.execute(query)
    db_user_username = result.scalar_one_or_none()
    
    if db_user_username:
        raise HTTPException(
            status_code=400,
            detail="Имя пользователя уже занято"
        )
    
    # Создаем нового пользователя
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user


# Получение списка всех пользователей (только для администраторов)
@router.get("/", response_model=List[UserSchema])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    query = select(User).offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()
    return users


# Получение базовой информации о всех пользователях (доступно всем авторизованным пользователям)
@router.get("/basic", response_model=List[dict])
async def read_users_basic(
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    query = select(User.id, User.full_name, User.username, User.role)
    result = await db.execute(query)
    users = result.all()
    return [{"id": user.id, "full_name": user.full_name, "username": user.username, "role": user.role} for user in users]


# Получение информации о текущем пользователе
@router.get("/me/", response_model=UserMe)
async def read_user_me(current_user: User = Depends(get_current_active_user)):
    return current_user


# Смена пароля текущим пользователем
@router.post("/me/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    password_data: PasswordChange,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Эндпоинт для смены пароля текущего пользователя
    Пользователь должен предоставить текущий пароль для подтверждения
    """
    # Проверяем, что текущий пароль верный
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный текущий пароль"
        )
    
    # Проверяем минимальную длину нового пароля
    if len(password_data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль должен содержать не менее 8 символов"
        )
    
    # Хешируем и сохраняем новый пароль
    hashed_password = get_password_hash(password_data.new_password)
    
    # Используем update вместо прямого изменения объекта
    query = update(User).where(User.id == current_user.id).values(hashed_password=hashed_password)
    await db.execute(query)
    await db.commit()
    
    return {"message": "Пароль успешно изменен"}


# Получение информации о пользователе по ID
@router.get("/{user_id}", response_model=UserSchema)
async def read_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение информации о пользователе по ID
    Только администраторы могут просматривать информацию о пользователях
    """
    # Проверяем, что текущий пользователь имеет права администратора
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра данного пользователя"
        )
    
    query = select(User).filter(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


# Обновление пользователя
@router.put("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: int,
    user: UserUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Обновление данных пользователя
    Только администраторы могут обновлять данные пользователей
    """
    # Проверяем, что текущий пользователь имеет права администратора
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для обновления данного пользователя"
        )
    
    # Сначала получаем пользователя, чтобы проверить его существование
    query = select(User).filter(User.id == user_id)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Обновляем данные пользователя
    user_data = user.model_dump(exclude_unset=True)
    
    # Если передан пароль, хешируем его
    if "password" in user_data:
        user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    
    # Выполняем обновление
    query = update(User).where(User.id == user_id).values(**user_data)
    await db.execute(query)
    await db.commit()
    
    # Получаем обновленного пользователя
    query = select(User).filter(User.id == user_id)
    result = await db.execute(query)
    updated_user = result.scalar_one()
    
    return updated_user


# Удаление пользователя (только для администраторов)
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: int,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_admin)
):
    # Сначала получаем пользователя, чтобы проверить его существование
    query = select(User).filter(User.id == user_id)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Запрещаем удалять самого себя
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить собственный аккаунт"
        )
    
    # Удаляем пользователя
    query = delete(User).where(User.id == user_id)
    await db.execute(query)
    await db.commit()
    
    return None 