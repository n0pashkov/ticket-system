import sqlite3
import os

# Путь к базе данных
DB_PATH = 'ticket_system.db'

def migrate_database():
    """
    Обновляет схему базы данных для поддержки категорий заявок
    """
    # Проверяем существование базы данных
    if not os.path.exists(DB_PATH):
        print(f"Ошибка: База данных {DB_PATH} не найдена")
        return False
    
    # Подключаемся к базе данных
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Проверяем, существует ли уже таблица ticket_categories
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ticket_categories'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            # Создаем таблицу ticket_categories
            print("Создание таблицы ticket_categories...")
            cursor.execute('''
            CREATE TABLE ticket_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT NULL
            )
            ''')
            
            print("Таблица ticket_categories успешно создана")
        else:
            print("Таблица ticket_categories уже существует")
        
        # Проверяем, есть ли уже столбец category_id в таблице tickets
        cursor.execute("PRAGMA table_info(tickets)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'category_id' not in column_names:
            # Добавляем столбец category_id в таблицу tickets
            print("Добавление столбца category_id в таблицу tickets...")
            cursor.execute('''
            ALTER TABLE tickets ADD COLUMN category_id INTEGER
            ''')
            
            # Добавляем внешний ключ (в SQLite это делается через создание нового ограничения)
            print("Добавление внешнего ключа...")
            cursor.execute('''
            PRAGMA foreign_keys = ON;
            ''')
            
            print("Столбец category_id успешно добавлен в таблицу tickets")
        else:
            print("Столбец category_id уже существует в таблице tickets")
        
        # Сохраняем изменения
        conn.commit()
        print("Миграция успешно завершена")
        return True
        
    except sqlite3.Error as e:
        # В случае ошибки откатываем изменения
        conn.rollback()
        print(f"Ошибка при выполнении миграции: {e}")
        return False
    
    finally:
        # Закрываем соединение с базой данных
        conn.close()

if __name__ == "__main__":
    migrate_database() 