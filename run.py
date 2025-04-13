import uvicorn
import os
from app.db.init_db import init_db
from app.db.database import SessionLocal

# Инициализируем базу данных перед запуском
def initialize_database():
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()

if __name__ == "__main__":
    # Инициализируем базу данных
    initialize_database()
    
    # Определяем режим работы (разработка или продакшн)
    environment = os.getenv("ENVIRONMENT", "production")
    reload_enabled = environment.lower() == "development"
    
    # Запускаем сервер
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 