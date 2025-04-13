from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import uuid
from datetime import datetime

from app.db.database import get_db
from app.models.models import User, Ticket
from app.core.security import get_current_active_user
from app.schemas.schemas import Attachment, AttachmentCreate

# Здесь нужно будет создать модель Attachment в models и схему в schemas
# Для примера предположим, что они уже существуют

router = APIRouter()

# Максимальный размер файла (10 МБ)
MAX_FILE_SIZE = 10 * 1024 * 1024

# Разрешенные типы файлов
ALLOWED_EXTENSIONS = {
    "jpg", "jpeg", "png", "gif",  # изображения
    "pdf", "doc", "docx", "xls", "xlsx", "txt",  # документы
    "zip", "rar"  # архивы
}


def allowed_file(filename: str) -> bool:
    """Проверка допустимости типа файла"""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@router.post("/upload/{ticket_id}", response_model=Attachment, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    ticket_id: int,
    file: UploadFile = File(...),
    description: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Загрузка вложения к заявке
    """
    # Проверяем существование заявки
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права доступа
    if current_user.role == "user" and ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для добавления вложений к этой заявке"
        )
    
    # Проверяем тип файла
    if not allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый тип файла. Разрешены только: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Проверяем размер файла
    file_size = 0
    contents = await file.read()
    file_size = len(contents)
    await file.seek(0)  # Сбрасываем указатель чтения в начало
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Размер файла превышает максимально допустимый ({MAX_FILE_SIZE // (1024 * 1024)} МБ)"
        )
    
    # Генерируем уникальное имя файла
    file_extension = file.filename.rsplit(".", 1)[1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    
    # Создаем директорию для хранения файлов, если она не существует
    upload_dir = os.path.join("uploads", str(ticket_id))
    os.makedirs(upload_dir, exist_ok=True)
    
    # Сохраняем файл
    file_path = os.path.join(upload_dir, unique_filename)
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Сохраняем информацию о вложении в базе данных
    # Здесь должен быть код для сохранения в БД
    
    # Для примера возвращаем заглушку
    return {
        "id": 1,
        "ticket_id": ticket_id,
        "filename": file.filename,
        "stored_filename": unique_filename,
        "file_path": file_path,
        "file_size": file_size,
        "content_type": file.content_type,
        "description": description,
        "uploaded_by": current_user.id,
        "uploaded_at": datetime.now()
    }


@router.get("/{ticket_id}", response_model=List[Attachment])
def get_ticket_attachments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Получение списка вложений к заявке
    """
    # Проверяем существование заявки
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Заявка не найдена"
        )
    
    # Проверяем права доступа
    if current_user.role == "user" and ticket.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет прав для просмотра вложений этой заявки"
        )
    
    # Здесь должен быть запрос к базе данных для получения вложений
    # Для примера возвращаем пустой список
    return []


@router.get("/download/{attachment_id}")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Скачивание вложения
    """
    # Здесь должен быть запрос к базе данных для получения информации о вложении
    # и проверка прав доступа
    
    # Для примера возвращаем заглушку
    return {"message": "Эндпоинт для скачивания файла"}


@router.delete("/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Удаление вложения
    """
    # Здесь должен быть запрос к базе данных для получения информации о вложении
    # и проверка прав доступа
    
    # Для примера просто возвращаем None
    return None 