import os
import sys
import argparse
import subprocess

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

def create_migration(message):
    """Создает новую миграцию с указанным сообщением."""
    return run_command(f"alembic revision --autogenerate -m \"{message}\"")

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
    else:
        parser.print_help()
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 