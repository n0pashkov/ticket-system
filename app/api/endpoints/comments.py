from typing import List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.comment import Comment
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse
from app.core.security import get_current_user

router = APIRouter()


@router.post("/{ticket_id}", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    ticket_id: int,
    comment: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Создать новый комментарий к заявке.
    """
    # Проверяем, существует ли заявка
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права доступа
    # Пользователь может комментировать только свои заявки
    # Агенты и администраторы могут комментировать любые заявки
    if current_user.role == "user" and ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для добавления комментария к этой заявке"
        )
    
    # Создаем комментарий
    db_comment = Comment(
        text=comment.text,
        ticket_id=ticket_id,
        author_id=current_user.id
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment


@router.get("/{ticket_id}", response_model=List[CommentResponse])
def get_ticket_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Получить все комментарии к заявке.
    """
    # Проверяем, существует ли заявка
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права доступа
    # Пользователь может видеть только комментарии своих заявок
    # Агенты и администраторы могут видеть комментарии любых заявок
    if current_user.role == "user" and ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра комментариев к этой заявке"
        )
    
    return db.query(Comment).filter(Comment.ticket_id == ticket_id).all()


@router.get("/comment/{comment_id}", response_model=CommentResponse)
def get_comment_by_id(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Получить комментарий по ID.
    """
    # Проверяем, существует ли комментарий
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Комментарий не найден"
        )
    
    # Получаем заявку, к которой относится комментарий
    ticket = db.query(Ticket).filter(Ticket.id == comment.ticket_id).first()
    
    # Проверяем права доступа
    # Пользователь может видеть только комментарии своих заявок
    # Агенты и администраторы могут видеть комментарии любых заявок
    if current_user.role == "user" and ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра этого комментария"
        )
    
    return comment


@router.put("/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    comment_data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Обновить комментарий.
    """
    # Проверяем, существует ли комментарий
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Комментарий не найден"
        )
    
    # Проверяем права доступа
    # Пользователь может обновлять только свои комментарии
    # Администратор может обновлять любые комментарии
    if current_user.role != "admin" and comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для обновления этого комментария"
        )
    
    # Обновляем комментарий
    comment.text = comment_data.text
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> None:
    """
    Удалить комментарий.
    """
    # Проверяем, существует ли комментарий
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Комментарий не найден"
        )
    
    # Проверяем права доступа
    # Пользователь может удалять только свои комментарии
    # Администратор может удалять любые комментарии
    if current_user.role != "admin" and comment.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для удаления этого комментария"
        )
    
    db.delete(comment)
    db.commit() 