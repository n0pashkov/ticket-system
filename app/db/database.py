from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

# Создаем SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL, 
    connect_args=settings.DATABASE_PARAMS,
)

# Создаем фабрику сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Создаем базовый класс для моделей
Base = declarative_base()

# Функция для создания сессии
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 