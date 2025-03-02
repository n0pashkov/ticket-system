FROM python:3.9-slim

WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода приложения
COPY . .

# Создаем непривилегированного пользователя для запуска приложения
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# Создание необходимых директорий
RUN mkdir -p /app/logs

# Запуск приложения
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"] 