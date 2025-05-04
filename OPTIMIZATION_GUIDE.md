# Руководство по оптимизации системы заявок

Данный документ содержит рекомендации и инструкции по оптимизации проекта, с фокусом на кэширование, отзывчивость интерфейса и асинхронные операции.

## Содержание
1. [Backend оптимизации](#backend-оптимизации)
   - [HTTP-кэширование](#http-кэширование)
   - [Асинхронные запросы к БД](#асинхронные-запросы-к-бд)
   - [Настройки логирования](#настройки-логирования)
2. [Frontend оптимизации](#frontend-оптимизации)
   - [Настройки React Query](#настройки-react-query)
   - [Оптимистичные обновления](#оптимистичные-обновления) 
   - [Предотвращение кэширования браузера](#предотвращение-кэширования-браузера)
3. [Интеграция оптимизаций](#интеграция-оптимизаций)
   - [Создание новых страниц](#создание-новых-страниц)
   - [Добавление новых API-эндпоинтов](#добавление-новых-api-эндпоинтов)
4. [Шаблоны кода](#шаблоны-кода)
   - [Шаблон React Query хука](#шаблон-react-query-хука)
   - [Шаблон API-метода](#шаблон-api-метода)
   - [Шаблон асинхронного эндпоинта](#шаблон-асинхронного-эндпоинта)

## Backend оптимизации

### HTTP-кэширование

1. **Отключение кэша для динамических данных**
   - Добавлены пути, исключенные из кэширования в `HTTPCacheMiddleware`:
   ```python
   self.exclude_paths = [
       "/api/v1/auth",
       "/api/v1/users/me",
       "/api/v1/tickets/",
       "/api/v1/tickets/assign",
       "/api/v1/tickets/status",
       "/api/v1/tickets/close"
   ]
   ```

2. **Настройка времени кэширования**
   - Время кэширования по умолчанию снижено до 30 секунд
   - Для категорий и редко изменяемых данных: 3600 секунд (1 час)
   - Для статистики: 300 секунд (5 минут)
   - Для мониторинга: 30 секунд
   
3. **Заголовки кэширования**
   - Для GET-запросов: `Cache-Control: public, max-age=X, stale-while-revalidate=Y`
   - Для POST/PUT/DELETE: `Cache-Control: no-cache, no-store, must-revalidate`

### Асинхронные запросы к БД

1. **Конвертация синхронных функций в асинхронные**
   - Используется `async/await` для всех операций с базой данных
   - Все SQL-запросы выполняются через `aiosqlite`
   - Используется `AsyncSession` из SQLAlchemy

2. **Асинхронные зависимости в FastAPI**
   ```python
   from app.db.async_database import get_async_db
   
   @router.get("/items")
   async def get_items(db: AsyncSession = Depends(get_async_db)):
       # асинхронный код...
   ```

### Настройки логирования

1. **Отключение лишних отладочных сообщений**
   ```python
   # В модуле app/core/logging.py
   def configure_specific_loggers():
       logging.getLogger("aiosqlite").setLevel(logging.WARNING)
       logging.getLogger("sqlite3").setLevel(logging.WARNING)
       logging.getLogger("async_database").setLevel(logging.INFO)
       logging.getLogger("database").setLevel(logging.INFO)
       logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
       logging.getLogger("sqlalchemy.pool").setLevel(logging.WARNING)
   ```

## Frontend оптимизации

### Настройки React Query

1. **Базовые настройки кэширования**
   - Короткий staleTime: 10-15 секунд вместо 1 минуты
   - Автоматическое обновление: `refetchInterval: 30 * 1000`
   - Обновление при возврате на вкладку: `refetchOnWindowFocus: true`

   ```javascript
   const query = useQuery({
     queryKey: ['entity', id],
     queryFn: () => api.getEntity(id),
     staleTime: 10 * 1000,        // 10 секунд
     cacheTime: 5 * 60 * 1000,    // 5 минут
     refetchInterval: 30 * 1000,  // 30 секунд
     refetchOnWindowFocus: true
   });
   ```

### Оптимистичные обновления

1. **Немедленное обновление интерфейса**
   ```javascript
   const mutation = useMutation({
     mutationFn: (data) => api.updateEntity(data),
     onSuccess: (response, variables) => {
       // Немедленно обновляем данные в кэше
       queryClient.setQueryData(['entity', variables.id], response.data);
       
       // Обновляем список всех сущностей
       queryClient.setQueriesData(['entities'], (oldData) => {
         if (!oldData) return oldData;
         return oldData.map(item => 
           item.id === variables.id ? response.data : item
         );
       });
       
       // Затем принудительно запрашиваем обновленные данные
       queryClient.invalidateQueries({ 
         queryKey: ['entities'], 
         refetchActive: true 
       });
     }
   });
   ```

### Предотвращение кэширования браузера

1. **Добавление параметра _nocache**
   ```javascript
   getAll: (filters = {}) => {
     // Добавляем параметр для обхода кэша
     const params = { 
       ...filters,
       _nocache: new Date().getTime() 
     };
     
     return api.get('/entities/', { 
       params,
       headers: {
         'Cache-Control': 'no-cache, no-store, must-revalidate',
         'Pragma': 'no-cache',
         'Expires': '0'
       }
     });
   }
   ```

2. **Заголовки для предотвращения кэширования**
   - Для всех API запросов добавлены заголовки:
     - `Cache-Control: no-cache, no-store, must-revalidate`
     - `Pragma: no-cache`
     - `Expires: 0`

## Интеграция оптимизаций

### Создание новых страниц

1. **Структура новой страницы**
   - Создайте компонент страницы в `src/pages/`
   - Создайте кастомный хук в `src/hooks/`
   - Определите необходимые API-методы в `src/api/api.js`

2. **Использование оптимизированных хуков**
   ```jsx
   // Компонент страницы
   const EntityPage = () => {
     const { 
       entities, 
       isLoading, 
       createEntity, 
       updateEntity 
     } = useEntities();
     
     if (isLoading) return <LinearProgress />;
     
     return (
       // JSX компонента
     );
   };
   ```

### Добавление новых API-эндпоинтов

1. **Backend (FastAPI)**
   ```python
   # app/api/endpoints/entities.py
   @router.get("/")
   async def get_entities(
       db: AsyncSession = Depends(get_async_db),
       current_user: User = Depends(get_current_active_user)
   ):
       result = await db.execute(select(Entity))
       entities = result.scalars().all()
       return entities
   ```

2. **Frontend (API-клиент)**
   ```javascript
   // src/api/api.js
   export const entitiesAPI = {
     getAll: (filters = {}) => api.get('/entities/', {
       params: { ...filters, _nocache: new Date().getTime() },
       headers: {
         'Cache-Control': 'no-cache, no-store, must-revalidate',
         'Pragma': 'no-cache',
         'Expires': '0'
       }
     }),
     // другие методы...
   };
   ```

## Шаблоны кода

### Шаблон React Query хука

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entityAPI } from '../api/api';

export const useEntities = (filters = {}) => {
  const queryClient = useQueryClient();

  // Запрос списка сущностей
  const entitiesQuery = useQuery({
    queryKey: ['entities', filters],
    queryFn: () => entityAPI.getAll(filters),
    select: (data) => data.data || [],
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  // Мутация создания
  const createMutation = useMutation({
    mutationFn: entityAPI.create,
    onSuccess: (response) => {
      // Оптимистичное обновление
      queryClient.setQueriesData(['entities'], (oldData) => {
        if (!oldData) return [response.data];
        return [...oldData, response.data];
      });
      
      // Принудительное обновление с сервера
      queryClient.invalidateQueries({ 
        queryKey: ['entities'],
        refetchActive: true 
      });
    }
  });

  // Мутация обновления
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => entityAPI.update(id, data),
    onSuccess: (response, variables) => {
      queryClient.setQueryData(['entities', variables.id], response.data);
      queryClient.invalidateQueries({ 
        queryKey: ['entities'],
        refetchActive: true 
      });
    }
  });

  return {
    entities: entitiesQuery.data || [],
    isLoading: entitiesQuery.isLoading,
    isError: entitiesQuery.isError,
    error: entitiesQuery.error,
    createEntity: createMutation.mutate,
    updateEntity: updateMutation.mutate,
  };
};
```

### Шаблон API-метода

```javascript
// src/api/api.js
export const entityAPI = {
  // GET-запрос с отключением кэширования
  getAll: (filters = {}) => {
    // Очищаем undefined значения
    const cleanFilters = { ...filters };
    Object.keys(cleanFilters).forEach(key => {
      if (cleanFilters[key] === undefined) {
        delete cleanFilters[key];
      }
    });
    
    // Добавляем параметр для обхода кэша
    cleanFilters._nocache = new Date().getTime();
    
    return api.get('/entities/', { 
      params: cleanFilters,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },
  
  // POST-запрос
  create: (data) => api.post('/entities/', data, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
  
  // PUT-запрос
  update: (id, data) => api.put(`/entities/${id}`, data, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
};
```

### Шаблон асинхронного эндпоинта

```python
# app/api/endpoints/entities.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.async_database import get_async_db
from app.models.models import Entity, User
from app.schemas.schemas import EntitySchema, EntityCreate
from app.core.security import get_current_active_user
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("api.entities")

@router.get("/", response_model=List[EntitySchema])
async def get_entities(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Получение списка сущностей"""
    try:
        query = select(Entity).offset(skip).limit(limit)
        result = await db.execute(query)
        entities = result.scalars().all()
        return entities
    except Exception as e:
        logger.error(f"Error getting entities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving entities"
        )

@router.post("/", response_model=EntitySchema)
async def create_entity(
    entity: EntityCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: User = Depends(get_current_active_user)
):
    """Создание новой сущности"""
    try:
        db_entity = Entity(**entity.model_dump())
        db.add(db_entity)
        await db.commit()
        await db.refresh(db_entity)
        return db_entity
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating entity: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating entity"
        ) 

## Управление структурой проекта и предотвращение дублирования

Данный раздел описывает практики управления структурой проекта для предотвращения дублирования кода и файлов, что является важным аспектом оптимизации.

### Структура проекта и назначение директорий

#### Backend (Python/FastAPI)

```
app/
├── api/                # API эндпоинты
│   ├── api.py          # Основной маршрутизатор API
│   └── endpoints/      # Эндпоинты группированные по функциональности
│       ├── auth.py     # Аутентификация
│       ├── tickets.py  # Заявки
│       ├── users.py    # Пользователи
│       ├── categories.py # Категории
│       └── equipment.py # Оборудование
├── core/               # Ядро приложения
│   ├── config.py       # Настройки
│   ├── security.py     # Безопасность и аутентификация
│   └── logging.py      # Настройки логирования
├── db/                 # Взаимодействие с базой данных
│   ├── database.py     # Синхронные операции с БД
│   └── async_database.py # Асинхронные операции с БД
├── models/             # Модели данных
│   └── models.py       # ORM модели 
└── schemas/            # Схемы данных (Pydantic)
    └── schemas.py      # Схемы валидации и сериализации
```

#### Frontend (React/Material UI)

```
src/
├── api/              # API-клиенты
│   └── api.js        # Все API-клиенты в одном месте
├── components/       # Переиспользуемые компоненты
├── context/          # React контексты
│   ├── AuthContext.js    # Аутентификация
│   └── ThemeContext.js   # Темы оформления
├── hooks/            # Кастомные React хуки
├── pages/            # Страницы приложения
├── utils/            # Вспомогательные функции
└── App.js            # Основной компонент приложения
```

### Правила организации и расширения кода

1. **Один файл - одна ответственность:**
   - **Backend:** каждый файл в `endpoints/` отвечает за конкретную сущность
   - **Frontend:** каждый хук в `hooks/` отвечает за конкретный тип данных

2. **Расширение существующих файлов вместо создания новых:**
   - **Backend:** добавляйте новые эндпоинты в существующие файлы, если они относятся к той же сущности
   - **Frontend:** добавляйте новые API-методы в существующие объекты в `api.js`

3. **Принцип DRY (Don't Repeat Yourself):**
   - Создавайте общие утилиты для повторяющихся операций
   - Используйте наследование и композицию для переиспользования кода

### Предотвращение дублирования файлов и функциональности

#### Backend

1. **Регистрация маршрутов:**
   - Всегда добавляйте новые маршрутизаторы эндпоинтов в `app/api/api.py`:
   ```python
   # app/api/api.py
   from fastapi import APIRouter
   from app.api.endpoints import users, tickets, auth, categories, equipment
   
   api_router = APIRouter()
   api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
   api_router.include_router(users.router, prefix="/users", tags=["users"])
   api_router.include_router(tickets.router, prefix="/tickets", tags=["tickets"])
   api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
   api_router.include_router(equipment.router, prefix="/equipment", tags=["equipment"])
   ```

2. **Импорт зависимостей:**
   - Используйте существующие зависимости из `app/core/` вместо создания новых:
   ```python
   # Используйте существующий функционал безопасности
   from app.core.security import get_password_hash, verify_password
   
   # Используйте существующий логгер
   from app.core.logging import get_logger
   logger = get_logger("api.equipment")
   ```

3. **Асинхронные операции с БД:**
   - Используйте единый подход к асинхронным операциям из `app/db/async_database.py`:
   ```python
   from app.db.async_database import get_async_db
   
   @router.get("/")
   async def get_items(db: AsyncSession = Depends(get_async_db)):
       # Асинхронные операции
   ```

#### Frontend

1. **API-клиенты:**
   - Не создавайте новые файлы для API-клиентов, добавляйте их в существующий `api.js`:
   ```javascript
   // src/api/api.js
   // НЕ СОЗДАВАЙТЕ ОТДЕЛЬНЫЙ ФАЙЛ equipment-api.js!
   
   // Добавляйте новые объекты или расширяйте существующие
   export const equipmentAPI = {
     getAll: () => api.get('/equipment/'),
     getById: (id) => api.get(`/equipment/${id}`),
     create: (data) => api.post('/equipment/', data),
     update: (id, data) => api.put(`/equipment/${id}`, data),
     delete: (id) => api.delete(`/equipment/${id}`),
   };
   ```

2. **React Query хуки:**
   - Для каждого типа данных должен быть только один файл хука:
   ```javascript
   // src/hooks/useEquipment.js
   // Один файл для всех операций с оборудованием
   
   export const useEquipment = (params = {}) => {
     // Запросы и мутации для оборудования
     
     return {
       equipment,
       isLoading,
       createEquipment,
       updateEquipment,
       deleteEquipment,
     };
   };
   ```

3. **Темы оформления:**
   - Используйте `ThemeContext.js` для управления темами, не создавайте отдельные файлы тем:
   ```javascript
   // НЕ СОЗДАВАЙТЕ ОТДЕЛЬНЫЙ ФАЙЛ theme.js!
   // Вместо этого используйте существующий контекст
   
   import { useTheme } from '@mui/material';
   import { useThemeMode } from '../context/ThemeContext';
   
   const Component = () => {
     const theme = useTheme();
     const { darkMode, toggleTheme } = useThemeMode();
     // ...
   };
   ```

### Примеры неправильного и оптимального кода

#### Backend

❌ **Неправильно: Дублирование настроек безопасности**
```python
# app/api/endpoints/my_custom_endpoint.py
# НЕ ДУБЛИРУЙТЕ КОД БЕЗОПАСНОСТИ
import jwt
from datetime import datetime, timedelta

SECRET_KEY = "my_secret_key"

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
```

✅ **Правильно: Использование существующего функционала**
```python
# app/api/endpoints/my_custom_endpoint.py
from app.core.security import create_access_token

@router.post("/token")
async def create_token(user_data: dict):
    token = create_access_token({"sub": user_data["username"]})
    return {"access_token": token}
```

#### Frontend

❌ **Неправильно: Создание нового хука с дублированием функциональности**
```javascript
// src/hooks/useEquipmentList.js - НЕ СОЗДАВАЙТЕ ЭТОТ ФАЙЛ!
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useEquipmentList = () => {
  const fetchEquipment = () => axios.get('/api/v1/equipment/');
  
  return useQuery(['equipment'], fetchEquipment);
};
```

✅ **Правильно: Использование и расширение существующего хука**
```javascript
// src/hooks/useEquipment.js - ИСПОЛЬЗУЙТЕ ЭТОТ ФАЙЛ
import { useQuery, useMutation } from '@tanstack/react-query';
import { equipmentAPI } from '../api/api';

export const useEquipment = (params = {}) => {
  // Запрос списка оборудования
  const equipmentQuery = useQuery({
    queryKey: ['equipment', params],
    queryFn: () => equipmentAPI.getAll(params),
    // Настройки оптимизации...
  });
  
  // Добавляйте необходимые мутации здесь
  
  return {
    equipment: equipmentQuery.data || [],
    isLoading: equipmentQuery.isLoading,
    error: equipmentQuery.error,
    // Другие функции и свойства...
  };
};
```

### Контрольный список перед добавлением новой функциональности

1. **Проверка существующих файлов:**
   - Существует ли уже файл для работы с целевой сущностью?
   - Можно ли добавить новую функциональность в существующий файл?

2. **Оценка размера и ответственности:**
   - Если файл слишком большой, можно ли его разделить по логическим группам?
   - Придерживается ли новый код принципу единой ответственности?

3. **Проверка импортов:**
   - Нет ли циклических зависимостей при добавлении нового функционала?
   - Используются ли оптимальные импорты для снижения объема кода?

4. **Тестирование обратной совместимости:**
   - Не нарушает ли новый код существующую функциональность?
   - Все ли существующие тесты проходят после изменений?

Следуя этим принципам, вы поможете поддерживать чистоту кодовой базы, облегчите добавление новых функций и избежите проблем с дублированием кода, что в свою очередь повысит производительность и упростит поддержку приложения. 