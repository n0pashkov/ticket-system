import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentAPI, categoriesAPI, api } from '../api/api';
import { useMemo, useEffect } from 'react';

export const useEquipment = (params = {}) => {
  const queryClient = useQueryClient();

  // Принудительно очищаем кэш при инициализации хука
  useEffect(() => {
    // Удаляем все кэшированные данные оборудования
    queryClient.removeQueries({ queryKey: ['equipment'] });
    queryClient.removeQueries({ queryKey: ['equipment', 'byCategory'] });
    queryClient.removeQueries({ queryKey: ['equipment', 'debug'] });
    
    // Очищаем локальное хранилище от кэша React Query
    try {
      const cacheKeys = Object.keys(localStorage).filter(key => 
        key.includes('equipment') || key.includes('react-query')
      );
      
      for (const key of cacheKeys) {
        localStorage.removeItem(key);
      }
      
      // Очищаем sessionStorage
      const sessionKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('equipment') || key.includes('react-query')
      );
      
      for (const key of sessionKeys) {
        sessionStorage.removeItem(key);
      }
    } catch (e) {
      console.error('Ошибка при очистке кэша:', e);
    }
  }, [queryClient]);

  // Запрос на получение списка оборудования
  const equipmentQuery = useQuery({
    queryKey: ['equipment', params],
    queryFn: () => equipmentAPI.getAll(params),
    select: (data) => data.data || [],
    staleTime: 0, // Устанавливаем в 0, чтобы всегда считать данные устаревшими
    cacheTime: 0, // Устанавливаем в 0, чтобы не кэшировать
    refetchOnMount: 'always', // Всегда обновлять при монтировании компонента
    refetchOnWindowFocus: true,
    retry: 1, // Уменьшаем количество повторных попыток при ошибке
    onError: (error) => {
      console.error('Error fetching equipment:', error);
      return [];
    }
  });

  // Запрос на получение категорий оборудования
  const categoriesQuery = useQuery({
    queryKey: ['equipment', 'categories'],
    queryFn: () => equipmentAPI.getCategories(),
    select: (data) => data.data || [],
    staleTime: 60 * 60 * 1000, // 1 час
    cacheTime: 2 * 60 * 60 * 1000, // 2 часа
    onError: (error) => {
      console.error('Error fetching equipment categories:', error);
      return [];
    }
  });

  // Мутация для создания оборудования
  const createEquipmentMutation = useMutation({
    mutationFn: (data) => equipmentAPI.create(data),
    onSuccess: (response) => {
      // Получаем данные о новом оборудовании из ответа API
      const newEquipment = response.data;
      
      // Не выполняем оптимистичное обновление кэша, только инвалидируем его
      // для принудительного получения свежих данных с сервера
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
    onError: (error) => {
      console.error('Error creating equipment:', error);
      throw error;
    }
  });

  // Мутация для обновления оборудования
  const updateEquipmentMutation = useMutation({
    mutationFn: ({ id, data }) => equipmentAPI.update(id, data),
    onSuccess: (response, variables) => {
      // Не выполняем оптимистичное обновление кэша
      // Просто инвалидируем кэш для принудительного обновления данных с сервера
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
    onError: (error) => {
      console.error('Error updating equipment:', error);
      throw error;
    }
  });

  // Мутация для удаления оборудования
  const deleteEquipmentMutation = useMutation({
    mutationFn: (id) => equipmentAPI.delete(id),
    onMutate: async (id) => {
      // Отменяем любые исходящие запросы на получение оборудования
      await queryClient.cancelQueries({ queryKey: ['equipment'] });
      
      // Сохраняем предыдущее состояние
      const previousEquipment = queryClient.getQueryData(['equipment', params]);
      
      // Оптимистично обновляем UI
      if (previousEquipment) {
        try {
          // Проверяем, является ли previousEquipment массивом
          if (Array.isArray(previousEquipment)) {
            queryClient.setQueryData(['equipment', params], 
              previousEquipment.filter(item => item.id !== id)
            );
          } 
          // Если это объект с данными в свойстве data
          else if (previousEquipment.data && Array.isArray(previousEquipment.data)) {
            queryClient.setQueryData(['equipment', params], {
              ...previousEquipment,
              data: previousEquipment.data.filter(item => item.id !== id)
            });
          }
          // Если это другая структура, просто инвалидируем кэш
          else {
            console.log('Неизвестная структура данных кэша:', previousEquipment);
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
          }
        } catch (e) {
          console.error('Ошибка при обновлении кэша:', e);
          queryClient.invalidateQueries({ queryKey: ['equipment'] });
        }
      }
      
      return { previousEquipment };
    },
    onSuccess: (_, id) => {
      console.log(`Оборудование с ID ${id} успешно удалено`);
      
      // Инвалидируем все запросы, связанные с оборудованием
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      
      // Также инвалидируем запросы по категориям
      queryClient.invalidateQueries({ queryKey: ['equipment', 'byCategory'] });
      queryClient.invalidateQueries({ queryKey: ['equipment', 'debug'] });
      
      // Очищаем любой кэш в localStorage, связанный с оборудованием
      try {
        const equipmentCacheKeys = Object.keys(localStorage).filter(key => 
          key.includes('equipment') || key.includes('react-query')
        );
        
        for (const key of equipmentCacheKeys) {
          localStorage.removeItem(key);
        }
        
        // Очищаем кэш и в sessionStorage
        const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
          key.includes('equipment') || key.includes('react-query')
        );
        
        for (const key of sessionStorageKeys) {
          sessionStorage.removeItem(key);
        }
      } catch (e) {
        console.error('Ошибка при очистке кэша:', e);
      }
    },
    onError: (error, id, context) => {
      console.error(`Ошибка при удалении оборудования ID ${id}:`, error);
      
      // Если ошибка 404 (Not Found), значит оборудование уже удалено
      if (error?.response?.status === 404) {
        console.log('Оборудование уже удалено, обновляем интерфейс');
        
        // Инвалидируем кэш для принудительного обновления
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
        queryClient.invalidateQueries({ queryKey: ['equipment', 'byCategory'] });
        
        // Еще более радикальное решение - удаляем соответствующие записи из кэша напрямую
        try {
          // Пытаемся удалить конкретные записи оборудования из кэша
          const queryCache = queryClient.getQueryCache();
          const queries = queryCache.findAll(['equipment']);
          
          for (const query of queries) {
            const data = query.state.data;
            
            // Модифицируем кэшированные данные, удаляя элемент с указанным ID
            if (Array.isArray(data)) {
              query.setData(data.filter(item => item.id !== id));
            } else if (data && Array.isArray(data.data)) {
              query.setData({
                ...data,
                data: data.data.filter(item => item.id !== id)
              });
            }
          }
        } catch (e) {
          console.error('Ошибка при модификации кэша запросов:', e);
        }
        
        // Очищаем любой кэш в localStorage и sessionStorage, связанный с оборудованием
        try {
          const equipmentCacheKeys = Object.keys(localStorage).filter(key => 
            key.includes('equipment') || key.includes('react-query')
          );
          
          for (const key of equipmentCacheKeys) {
            localStorage.removeItem(key);
          }
          
          // Очищаем кэш и в sessionStorage
          const sessionStorageKeys = Object.keys(sessionStorage).filter(key => 
            key.includes('equipment') || key.includes('react-query')
          );
          
          for (const key of sessionStorageKeys) {
            sessionStorage.removeItem(key);
          }
        } catch (e) {
          console.error('Ошибка при очистке кэша хранилища:', e);
        }
        
        // Не возвращаем предыдущее состояние, чтобы не показывать удаленное оборудование
        return;
      }
      
      // Для других ошибок, пытаемся восстановить предыдущее состояние
      if (context?.previousEquipment) {
        try {
          queryClient.setQueryData(['equipment', params], context.previousEquipment);
        } catch (e) {
          console.error('Ошибка при восстановлении предыдущего состояния:', e);
          // Если не удалось восстановить, просто обновляем данные
          queryClient.invalidateQueries({ queryKey: ['equipment'] });
        }
      }
      
      // Для ошибок типа, просто инвалидируем кэш
      if (error instanceof TypeError) {
        console.log('Ошибка типа данных, обновляем интерфейс');
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
        return; // Не пробрасываем ошибку дальше
      }
      
      throw error;
    },
    onSettled: () => {
      // В любом случае (успех или ошибка) обновляем данные
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['equipment'] });
        queryClient.removeQueries({ queryKey: ['equipment', 'byCategory'] });
        queryClient.removeQueries({ queryKey: ['equipment', 'debug'] });
      }, 500);
    }
  });

  // Получение оборудования по категории
  const getEquipmentByCategory = (category) => {
    return queryClient.fetchQuery({
      queryKey: ['equipment', 'byCategory', category],
      queryFn: () => equipmentAPI.getByCategory(category),
      select: (data) => data.data || [],
      staleTime: 60 * 1000, // 1 минута
      cacheTime: 5 * 60 * 1000, // 5 минут
    });
  };

  return {
    equipment: equipmentQuery.data || [],
    categories: categoriesQuery.data || [],
    isLoading: equipmentQuery.isLoading,
    isError: equipmentQuery.isError,
    error: equipmentQuery.error,
    getEquipmentByCategory,
    refetch: () => {
      // Принудительно обновляем все запросы, связанные с оборудованием
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment', 'byCategory'] });
      queryClient.invalidateQueries({ queryKey: ['equipment', 'debug'] });
      
      // Затем запускаем рефетч
      return equipmentQuery.refetch();
    },
    createEquipment: createEquipmentMutation.mutateAsync,
    updateEquipment: updateEquipmentMutation.mutateAsync,
    deleteEquipment: (id) => {
      // Обертка для улучшенной обработки ошибок
      return deleteEquipmentMutation.mutateAsync(id)
        .catch(error => {
          // Если ошибка 404, считаем удаление успешным и обновляем UI
          if (error?.response?.status === 404) {
            console.log('Оборудование уже удалено, обновляем интерфейс');
            queryClient.invalidateQueries({ queryKey: ['equipment'] });
            return { success: true, message: 'Оборудование уже удалено' };
          }
          throw error;
        });
    }
  };
};

export const useEquipmentByCategory = (categoryId) => {
  // Добавляем журналирование для отладки
  console.log('useEquipmentByCategory получил categoryId:', categoryId);
  
  // Получаем доступ к кэшу запросов
  const queryClient = useQueryClient();
  
  // Принудительно очищаем кэш при инициализации хука
  useEffect(() => {
    if (categoryId) {
      queryClient.removeQueries({ queryKey: ['equipment', 'byCategory', categoryId] });
      queryClient.removeQueries({ queryKey: ['equipment', 'debug', categoryId] });
    }
  }, [categoryId, queryClient]);
  
  // Получаем категории для отображения названия
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll(),
    select: (data) => data.data || [],
    staleTime: 10 * 1000,
    cacheTime: 60 * 1000,
    enabled: false, // Не загружаем автоматически
  });
  
  // Отладочный запрос напрямую к эндпоинту debug
  const debugQuery = useQuery({
    queryKey: ['equipment', 'debug', categoryId],
    queryFn: async () => {
      if (!categoryId) return { data: [] };
      console.log('Отладочный запрос оборудования для категории ID:', categoryId);
      
      try {
        // Прямой запрос к отладочному эндпоинту
        const response = await api.get(`/equipment/debug/by-category/${categoryId}`);
        console.log('Отладочные данные оборудования:', response.data);
        return response;
      } catch (error) {
        console.error('Ошибка отладочного запроса:', error);
        return { data: [] };
      }
    },
    enabled: !!categoryId,
    staleTime: 5 * 1000,
  });
  
  // Запрос на получение оборудования по категории
  const equipmentQuery = useQuery({
    queryKey: ['equipment', 'byCategory', categoryId],
    queryFn: async () => {
      console.log('Запрос оборудования для категории ID:', categoryId);
      
      if (!categoryId) {
        console.warn('ID категории не указан');
        return { data: [] };
      }
      
      // Отправляем запрос напрямую с ID категории
      const response = await equipmentAPI.getByCategory(categoryId);
      console.log('Получены данные оборудования:', response.data);
      return response;
    },
    select: (data) => {
      const equipment = data.data || [];
      console.log('Отфильтрованное оборудование:', equipment);
      return equipment;
    },
    enabled: !!categoryId, // Запрос активен только если указана категория
    staleTime: 5 * 1000, // 5 секунд (уменьшаем для более частого обновления)
    cacheTime: 10 * 1000, // 10 секунд
    refetchOnMount: 'always', // Всегда обновлять при монтировании компонента
    refetchOnWindowFocus: true, // Перезапрашивать при фокусе окна
    refetchInterval: 20 * 1000, // Перезапрашивать каждые 20 секунд
    onError: (error) => {
      console.error(`Ошибка при получении оборудования для категории ${categoryId}:`, error);
      return [];
    }
  });

  // Если у нас есть отладочные данные, но нет основных, используем их
  const combinedEquipment = useMemo(() => {
    if (equipmentQuery.data && equipmentQuery.data.length > 0) {
      return equipmentQuery.data;
    }
    if (debugQuery.data?.data && debugQuery.data.data.length > 0) {
      return debugQuery.data.data;
    }
    return [];
  }, [equipmentQuery.data, debugQuery.data]);

  return {
    equipment: combinedEquipment,
    isLoading: equipmentQuery.isLoading || debugQuery.isLoading,
    isError: equipmentQuery.isError && debugQuery.isError,
    error: equipmentQuery.error || debugQuery.error,
    refetch: () => {
      equipmentQuery.refetch();
      debugQuery.refetch();
    }
  };
};

export default useEquipment; 