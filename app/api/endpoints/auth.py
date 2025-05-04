from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.security import verify_password, create_access_token, get_current_active_user
from app.db.async_database import get_async_db
from app.models.models import User
from app.schemas.schemas import Token
from app.core.logging import log_user_action_async

router = APIRouter()

# Асинхронная функция аутентификации
async def authenticate_user_async(db: AsyncSession, username: str, password: str):
    query = select(User).filter(User.username == username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_db)
):
    user = await authenticate_user_async(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Логируем успешный вход в систему
    await log_user_action_async(
        db=db,
        user=user,
        action_type="LOGIN",
        description=f"Пользователь {user.username} вошел в систему",
        entity_type="user",
        entity_id=user.id,
        request=request
    )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    # Логируем выход пользователя из системы
    await log_user_action_async(
        db=db,
        user=current_user,
        action_type="LOGOUT",
        description=f"Пользователь {current_user.username} вышел из системы",
        entity_type="user",
        entity_id=current_user.id,
        request=request
    )
    
    return {"detail": "Successfully logged out"} 