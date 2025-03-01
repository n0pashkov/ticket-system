# Инструкция по установке и настройке

## Установка на Windows

### Предварительные требования
1. Установите Python 3.7+ с официального сайта: https://www.python.org/downloads/
2. При установке отметьте опцию "Add Python to PATH"

### Шаги установки
1. Создайте папку для проекта и перейдите в неё
2. Создайте виртуальное окружение:
   ```
   python -m venv venv
   ```
3. Активируйте виртуальное окружение:
   ```
   .\venv\Scripts\activate
   ```
4. Установите зависимости:
   ```
   pip install -r requirements.txt
   ```
5. Инициализируйте базу данных:
   ```
   python init_database.py
   ```
6. Запустите приложение:
   ```
   python run.py
   ```

## Установка на Linux/Mac

### Предварительные требования
1. Установите Python 3.7+ через менеджер пакетов:
   ```
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3 python3-pip python3-venv
   
   # CentOS/RHEL
   sudo yum install python3 python3-pip
   
   # macOS с Homebrew
   brew install python
   ```

### Шаги установки
1. Создайте папку для проекта и перейдите в неё
2. Создайте виртуальное окружение:
   ```
   python3 -m venv venv
   ```
3. Активируйте виртуальное окружение:
   ```
   source venv/bin/activate
   ```
4. Установите зависимости:
   ```
   pip install -r requirements.txt
   ```
5. Инициализируйте базу данных:
   ```
   python init_database.py
   ```
6. Запустите приложение:
   ```
   python run.py
   ```

## Настройка переменных окружения

Все настройки приложения хранятся в файле `.env`. Вы можете изменить следующие параметры:

- `SECRET_KEY` - секретный ключ для генерации JWT токенов (измените на случайную строку в продакшене)
- `DATABASE_URL` - URL для подключения к базе данных (по умолчанию SQLite)

## Использование PostgreSQL вместо SQLite

Для использования PostgreSQL вместо SQLite:

1. Установите PostgreSQL и создайте базу данных
2. Установите дополнительную зависимость:
   ```
   pip install psycopg2-binary
   ```
3. Измените настройки в файле `.env`:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/dbname
   ```
4. Запустите инициализацию базы данных и приложение

## Настройка для продакшена

Для запуска в продакшен-среде рекомендуется:

1. Использовать надежный секретный ключ для JWT токенов
2. Настроить HTTPS с помощью обратного прокси (Nginx или Apache)
3. Использовать Gunicorn вместо Uvicorn:
   ```
   pip install gunicorn
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker app.main:app
   ```
4. Настроить системный сервис для автоматического запуска

## Устранение неполадок

### Ошибка при установке зависимостей
Если возникает ошибка при установке пакетов с nativeкодом (например, cryptography), установите необходимые зависимости:

```
# Ubuntu/Debian
sudo apt install build-essential libssl-dev libffi-dev python3-dev

# CentOS/RHEL
sudo yum install gcc openssl-devel bzip2-devel libffi-devel

# Windows
Установите Visual C++ Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

### База данных не инициализируется
Проверьте права доступа к директории, где будет создаваться файл базы данных 