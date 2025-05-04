import logging
from sqlalchemy.orm import Session

from app.db.database import engine, SessionLocal, Base
from app.core.security import get_password_hash
from app.models.models import User, UserRole

# Настраиваем логирование
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """
    Функция для инициализации базы данных
    """
    # Проверяем, есть ли уже администратор в базе
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    
    # Если администратора нет, создаем его
    if not admin:
        logger.info("Создание первого администратора")
        admin_user = User(
            email="admin@example.com",
            username="admin",
            full_name="System Administrator",
            hashed_password=get_password_hash("admin"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        logger.info(f"Администратор создан с логином: admin и паролем: admin")
    else:
        logger.info("Администратор уже существует в базе")
    
    # Можно добавить создание тестовых данных здесь, если нужно
    logger.info("База данных инициализирована успешно")


def main():
    """
    Основная функция для запуска инициализации базы данных
    """
    logger.info("Инициализация базы данных")
    # Создаем все таблицы с проверкой существования
    Base.metadata.create_all(bind=engine, checkfirst=True)
    
    # Создаем сессию
    db = SessionLocal()
    
    try:
        init_db(db)
    finally:
        db.close()


if __name__ == "__main__":
    main() 