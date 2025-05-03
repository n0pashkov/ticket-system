from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import QueuePool

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("database")

# Создаем SQLAlchemy engine с оптимизированными настройками пула соединений
engine = create_engine(
    settings.DATABASE_URL, 
    connect_args=settings.DATABASE_PARAMS,
    poolclass=QueuePool,
    pool_size=settings.DATABASE_POOL_SIZE,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_pre_ping=True,  # Проверка соединения перед использованием
)

# Создаем фабрику сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Создаем базовый класс для моделей
Base = declarative_base()

# Функция для создания сессии
def get_db():
    db = SessionLocal()
    try:
        logger.debug("Database session created")
        yield db
    finally:
        logger.debug("Database session closed")
        db.close()
