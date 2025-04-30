import os
import sys
import argparse
import subprocess
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sqlite3

# Путь к конфигурационному файлу alembic
alembic_cfg = Config(os.path.join(os.path.dirname(__file__), 'alembic.ini'))

def run_command(cmd):
    """Выполняет команду и выводит результат."""
    print(f"Выполнение: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка: {e}")
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print(e.stderr)
        return False

def run_migrations():
    """Запускает миграции базы данных с помощью alembic."""
    print("Запуск миграций базы данных...")
    command.upgrade(alembic_cfg, "head")
    print("Миграции успешно выполнены!")

def create_migration(message):
    """Создает новую миграцию с заданным сообщением."""
    print(f"Создание новой миграции: {message}")
    command.revision(alembic_cfg, autogenerate=True, message=message)
    print("Миграция успешно создана!")

def apply_migrations():
    """Применяет все миграции."""
    return run_command("alembic upgrade head")

def rollback_migrations(steps=1):
    """Откатывает указанное количество миграций."""
    return run_command(f"alembic downgrade -{steps}")

def show_migrations_history():
    """Показывает историю миграций."""
    return run_command("alembic history --verbose")

def show_current_migration():
    """Показывает текущую версию миграции."""
    return run_command("alembic current")

def check_alembic_dir():
    """Проверяет наличие директории с миграциями."""
    if not os.path.exists("alembic"):
        print("Директория 'alembic' не найдена. Инициализация...")
        return run_command("alembic init alembic")
    return True

def drop_comments_table():
    """Удаляет таблицу комментариев из базы данных."""
    print("Создание миграции для удаления таблицы комментариев...")
    
    # Создаем миграцию
    command.revision(alembic_cfg, message="remove_comments_table")
    
    # Получаем путь к последнему файлу миграции
    versions_dir = os.path.join(os.path.dirname(__file__), 'alembic', 'versions')
    migration_files = [f for f in os.listdir(versions_dir) if f.endswith('.py')]
    migration_files.sort()
    latest_migration = migration_files[-1]
    migration_path = os.path.join(versions_dir, latest_migration)
    
    # Содержимое миграции
    migration_content = """
\"\"\"remove_comments_table

Revision ID: {revision}
Revises: {down_revision}
Create Date: {create_date}

\"\"\"
from alembic import op
import sqlalchemy as sa
{imports}

# revision identifiers, used by Alembic.
revision = '{revision}'
down_revision = '{down_revision}'
branch_labels = {branch_labels}
depends_on = {depends_on}


def upgrade():
    # Удаляем таблицу comments
    op.drop_table('comments')


def downgrade():
    # Создаем таблицу comments при отмене миграции
    op.create_table('comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('author_id', sa.Integer(), nullable=True),
        sa.Column('ticket_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_comments_id'), 'comments', ['id'], unique=False)
"""
    
    # Читаем текущее содержимое файла миграции для получения метаданных
    with open(migration_path, 'r') as f:
        current_content = f.read()
    
    # Извлекаем метаданные
    import re
    revision = re.search(r"revision = '([^']+)'", current_content).group(1)
    down_revision = re.search(r"down_revision = '([^']+)'", current_content).group(1) if "down_revision = " in current_content else "None"
    create_date = re.search(r"Create Date: ([^\n]+)", current_content).group(1)
    imports = ""
    if "import sqlalchemy as sa" not in current_content:
        imports = "import sqlalchemy as sa"
    branch_labels = re.search(r"branch_labels = ([^\n]+)", current_content).group(1) if "branch_labels = " in current_content else "None"
    depends_on = re.search(r"depends_on = ([^\n]+)", current_content).group(1) if "depends_on = " in current_content else "None"
    
    # Заполняем шаблон
    migration_content = migration_content.format(
        revision=revision,
        down_revision=down_revision,
        create_date=create_date,
        imports=imports,
        branch_labels=branch_labels,
        depends_on=depends_on
    )
    
    # Записываем обновленное содержимое миграции
    with open(migration_path, 'w') as f:
        f.write(migration_content)
    
    print(f"Миграция создана: {migration_path}")
    
    # Запускаем миграцию
    print("Применение миграции...")
    command.upgrade(alembic_cfg, "head")
    print("Миграция успешно применена!")

def create_ticket_messages_table():
    """
    Создает таблицу для сообщений к заявкам
    """
    conn = sqlite3.connect('ticket_system.db')
    cursor = conn.cursor()
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS ticket_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (ticket_id) REFERENCES tickets (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()
    print("Таблица ticket_messages создана")

def main():
    """Основная функция для обработки аргументов командной строки."""
    parser = argparse.ArgumentParser(description="Управление миграциями базы данных")
    
    # Создаем подпарсеры для разных команд
    subparsers = parser.add_subparsers(dest="command", help="Команда для выполнения")
    
    # Команда для создания новой миграции
    create_parser = subparsers.add_parser("create", help="Создать новую миграцию")
    create_parser.add_argument("message", help="Сообщение для миграции")
    
    # Команда для применения миграций
    subparsers.add_parser("apply", help="Применить все миграции")
    
    # Команда для отката миграций
    rollback_parser = subparsers.add_parser("rollback", help="Откатить миграции")
    rollback_parser.add_argument("-s", "--steps", type=int, default=1, 
                             help="Количество шагов для отката (по умолчанию 1)")
    
    # Команда для просмотра истории миграций
    subparsers.add_parser("history", help="Показать историю миграций")
    
    # Команда для просмотра текущей версии
    subparsers.add_parser("current", help="Показать текущую версию миграции")
    
    # Команда для удаления таблицы комментариев
    subparsers.add_parser("drop_comments", help="Удалить таблицу комментариев")
    
    # Команда для создания таблицы ticket_messages
    subparsers.add_parser("create_ticket_messages", help="Создать таблицу ticket_messages")
    
    # Парсим аргументы
    args = parser.parse_args()
    
    # Проверяем наличие директории alembic
    if not check_alembic_dir():
        return 1
    
    # Выполняем соответствующую команду
    if args.command == "create":
        if create_migration(args.message):
            print(f"Миграция успешно создана: {args.message}")
        else:
            return 1
    elif args.command == "apply":
        if apply_migrations():
            print("Миграции успешно применены")
        else:
            return 1
    elif args.command == "rollback":
        if rollback_migrations(args.steps):
            print(f"Откат на {args.steps} миграций выполнен успешно")
        else:
            return 1
    elif args.command == "history":
        show_migrations_history()
    elif args.command == "current":
        show_current_migration()
    elif args.command == "drop_comments":
        drop_comments_table()
    elif args.command == "create_ticket_messages":
        create_ticket_messages_table()
    else:
        parser.print_help()
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 