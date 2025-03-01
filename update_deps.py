#!/usr/bin/env python3
"""
Скрипт для обновления зависимостей проекта.
Позволяет правильно обновить библиотеки без конфликтов.
"""

import sys
import subprocess
import os


def run_command(command):
    """Выполняет команду и возвращает True, если команда выполнена успешно."""
    print(f"Выполняем: {command}")
    try:
        subprocess.run(command, shell=True, check=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Ошибка при выполнении команды: {e}")
        return False


def main():
    """Основная функция для обновления зависимостей"""
    print("Начинаю обновление зависимостей...")
    
    # Обновление pip
    if not run_command(f"{sys.executable} -m pip install --upgrade pip"):
        return 1
    
    # Удаление старых версий библиотек
    packages_to_remove = ["fastapi", "pydantic", "sqlalchemy", "alembic"]
    for package in packages_to_remove:
        if not run_command(f"{sys.executable} -m pip uninstall -y {package}"):
            print(f"Не удалось удалить {package}, но продолжаем...")
    
    # Установка обновленных зависимостей
    if not run_command(f"{sys.executable} -m pip install -r requirements.txt"):
        return 1
    
    print("Зависимости успешно обновлены!")
    print("Теперь вы можете запустить приложение:")
    print(f"{sys.executable} run.py")
    
    return 0


if __name__ == "__main__":
    sys.exit(main()) 