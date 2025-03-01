from fastapi import Depends, HTTPException, status
from app.core.security import get_current_active_user
from app.models.models import User, UserRole


# Проверка, что пользователь является администратором
async def get_current_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуется роль администратора."
        )
    return current_user


# Проверка, что пользователь является агентом или администратором
async def get_current_agent_or_admin(current_user: User = Depends(get_current_active_user)):
    if current_user.role not in [UserRole.AGENT, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав. Требуется роль агента или администратора."
        )
    return current_user 