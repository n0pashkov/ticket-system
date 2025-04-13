from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, get_current_active_user
from app.core.dependencies import get_current_admin
from app.db.database import get_db
from app.models.models import User, UserRole
from app.schemas.schemas import User as UserSchema
from app.schemas.schemas import UserCreate, UserUpdate, UserMe

router = APIRouter()


# Регистрация нового пользователя (доступно только администраторам)
@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    # Проверяем, существует ли пользователь с таким email
    db_user_email = db.query(User).filter(User.email == user.email).first()
    if db_user_email:
        raise HTTPException(
            status_code=400,
            detail="Email уже зарегистрирован в системе"
        )
    
    # Проверяем, существует ли пользователь с таким username
    db_user_username = db.query(User).filter(User.username == user.username).first()
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
    db.commit()
    db.refresh(db_user)
    return db_user


# Получение списка всех пользователей (только для администраторов)
@router.get("/", response_model=List[UserSchema])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    users = db.query(User).offset(skip).limit(limit).all()
    return users


# Получение информации о текущем пользователе
@router.get("/me/", response_model=UserMe)
async def read_user_me(current_user: User = Depends(get_current_active_user)):
    return current_user


# Получение информации о пользователе по ID
@router.get("/{user_id}", response_model=UserSchema)
def read_user(
    user_id: int,
    db: Session = Depends(get_db),
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
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return user


# Обновление пользователя
@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
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
    
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Обновляем данные пользователя
    user_data = user.model_dump(exclude_unset=True)
    
    # Если передан пароль, хешируем его
    if "password" in user_data:
        user_data["hashed_password"] = get_password_hash(user_data.pop("password"))
    
    for key, value in user_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


# Удаление пользователя (только для администраторов)
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    db_user = db.query(User).filter(User.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    # Запрещаем удалять самого себя
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Нельзя удалить собственный аккаунт"
        )
    
    # Удаляем пользователя полностью
    db.delete(db_user)
    db.commit()
    return None 