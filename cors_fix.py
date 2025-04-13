"""
Временный скрипт для запуска FastAPI с правильными настройками CORS
"""
import os
import sys
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Добавляем текущую директорию в sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Импортируем приложение
try:
    from app.main import app
    from app.core.config import settings
    print("Успешно импортировали app!")
except ImportError as e:
    print(f"Ошибка импорта app: {e}")
    sys.exit(1)

# Удаляем существующий CORS middleware, если он есть
app.middleware_stack = None
app._middleware = []
app.user_middleware = []

# Добавляем новый CORS middleware с нужными настройками
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Пересобираем middleware stack
app.build_middleware_stack()

@app.middleware("http")
async def debug_cors(request: Request, call_next):
    print(f"Получен запрос с Origin: {request.headers.get('Origin')}")
    response = await call_next(request)
    print(f"Ответ с заголовками: {response.headers}")
    return response

if __name__ == "__main__":
    print("Запуск сервера на 0.0.0.0:8000 с настройками CORS для localhost:3000")
    uvicorn.run(app, host="0.0.0.0", port=8000) 