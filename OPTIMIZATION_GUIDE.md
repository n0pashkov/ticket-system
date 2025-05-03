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