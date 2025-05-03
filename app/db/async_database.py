from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.orm import declarative_base

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("async_database")

# Получаем асинхронный URL для базы данных
# Для SQLite добавляем +aiosqlite, для PostgreSQL заменяем postgresql:// на postgresql+asyncpg://
ASYNC_DATABASE_URL = settings.DATABASE_URL
if ASYNC_DATABASE_URL.startswith("sqlite:///"):
    ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
elif ASYNC_DATABASE_URL.startswith("postgresql://"):
    ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Создаем асинхронный движок
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    pool_pre_ping=True,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=10,
    echo=False,
)

# Создаем асинхронную фабрику сессий
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

# Базовый класс для моделей, тот же что и для синхронных операций
Base = declarative_base()

# Получение асинхронной сессии БД
async def get_async_db():
    """Dependency для асинхронной сессии БД в FastAPI"""
    async with AsyncSessionLocal() as session:
        logger.debug("Async database session created")
        try:
            yield session
        finally:
            logger.debug("Async database session closed")
            await session.close() 