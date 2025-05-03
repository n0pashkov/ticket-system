"""
Скрипт для добавления индексов к таблицам в базе данных
"""
import os
import sys
from sqlalchemy import create_engine, text

# Добавляем текущую директорию в PYTHONPATH
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.logging import setup_logging, get_logger

# Инициализируем логирование
setup_logging()
logger = get_logger("db_migration")

# Создаем SQLAlchemy engine
engine = create_engine(settings.DATABASE_URL)


def create_indexes():
    """
    Создает индексы для ускорения запросов
    """
    # SQL-запросы для создания индексов
    index_queries = [
        # Индексы для таблицы tickets
        "CREATE INDEX IF NOT EXISTS ix_tickets_status ON tickets (status);",
        "CREATE INDEX IF NOT EXISTS ix_tickets_created_at ON tickets (created_at);",
        "CREATE INDEX IF NOT EXISTS ix_tickets_creator_hidden ON tickets (creator_id, is_hidden_for_creator);",
        "CREATE INDEX IF NOT EXISTS ix_tickets_assigned_to ON tickets (assigned_to_id);",
        "CREATE INDEX IF NOT EXISTS ix_tickets_status_priority ON tickets (status, priority);",
        
        # Индексы для таблицы users
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_users_username ON users (username);",
        "CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);",
        "CREATE INDEX IF NOT EXISTS ix_users_role ON users (role);",
        
        # Индексы для таблицы ticket_messages
        "CREATE INDEX IF NOT EXISTS ix_ticket_messages_ticket_id ON ticket_messages (ticket_id);",
        "CREATE INDEX IF NOT EXISTS ix_ticket_messages_created_at ON ticket_messages (created_at);",
        
        # Индексы для таблицы maintenance
        "CREATE INDEX IF NOT EXISTS ix_maintenance_equipment_id ON maintenance (equipment_id);",
        "CREATE INDEX IF NOT EXISTS ix_maintenance_performed_at ON maintenance (performed_at);",
    ]
    
    # Выполняем запросы
    with engine.connect() as connection:
        for query in index_queries:
            try:
                connection.execute(text(query))
                logger.info(f"Executed: {query}")
            except Exception as e:
                logger.error(f"Error executing {query}: {str(e)}")
    
    logger.info("Index creation completed")


def get_indexes():
    """
    Получает список существующих индексов
    """
    # SQL-запрос для получения информации об индексах в SQLite
    query = """
    SELECT name, tbl_name 
    FROM sqlite_master 
    WHERE type = 'index' 
    ORDER BY tbl_name, name;
    """
    
    # Выполняем запрос
    with engine.connect() as connection:
        result = connection.execute(text(query))
        indexes = result.fetchall()
        
        logger.info(f"Found {len(indexes)} indexes:")
        for name, table in indexes:
            logger.info(f"  {table}.{name}")
    
    return indexes


if __name__ == "__main__":
    logger.info("Starting index migration")
    
    # Получаем список текущих индексов
    logger.info("Getting current indexes...")
    current_indexes = get_indexes()
    
    # Создаем новые индексы
    logger.info("Creating new indexes...")
    create_indexes()
    
    # Получаем список индексов после миграции
    logger.info("Getting indexes after migration...")
    new_indexes = get_indexes()
    
    # Выводим статистику
    added_indexes = len(new_indexes) - len(current_indexes)
    logger.info(f"Migration completed. Added {added_indexes} new indexes.") 