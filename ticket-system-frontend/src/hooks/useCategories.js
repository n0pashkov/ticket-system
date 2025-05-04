import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesAPI } from '../api/api';

export const useCategories = (params = {}) => {
  const queryClient = useQueryClient();

  // Запрос на получение всех категорий
  const categoriesQuery = useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoriesAPI.getAll(params),
    select: (data) => data.data || [],
    // Уменьшаем время кэширования для более быстрого обновления данных
    staleTime: 10 * 1000, // 10 секунд
    cacheTime: 60 * 1000, // 1 минута
    // Включаем автоматические перезапросы для обновления данных
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    onError: (error) => {
      console.error('Error fetching categories:', error);
      return [];
    }
  });

  // Мутация для создания новой категории
  const createCategoryMutation = useMutation({
    mutationFn: categoriesAPI.create,
    onSuccess: () => {
      // Инвалидируем кэши после успешного создания
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Принудительно запрашиваем обновление данных
      categoriesQuery.refetch();
    },
    onError: (error) => {
      console.error('Error creating category:', error);
    }
  });

  // Мутация для обновления категории
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => categoriesAPI.update(id, data),
    onSuccess: (data, variables) => {
      // Обновляем кэш конкретной категории после обновления
      queryClient.setQueryData(['categories', variables.id], (oldData) => ({
        ...oldData,
        data: variables.data
      }));
      // Инвалидируем общий список категорий
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Принудительно запрашиваем обновление данных
      categoriesQuery.refetch();
    },
    onError: (error) => {
      console.error('Error updating category:', error);
    }
  });

  // Мутация для удаления категории
  const deleteCategoryMutation = useMutation({
    mutationFn: categoriesAPI.delete,
    onSuccess: (data, variables) => {
      // Инвалидируем кэши после успешного удаления
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      // Оптимистически обновляем локальное состояние
      queryClient.setQueryData(['categories', params], (oldData) => {
        if (!oldData) return oldData;
        
        // Если у нас массив данных
        if (Array.isArray(oldData)) {
          return oldData.filter(cat => cat.id !== variables);
        }
        
        // Если у нас объект с data
        if (oldData.data && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.filter(cat => cat.id !== variables)
          };
        }
        
        return oldData;
      });
      
      // Принудительно запрашиваем обновление данных
      console.log('Category deleted, refetching data...');
      categoriesQuery.refetch();
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      // Инвалидируем кэш для принудительного обновления данных
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      categoriesQuery.refetch();
    }
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    error: categoriesQuery.error,
    refetch: categoriesQuery.refetch,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
  };
};

export const useCategory = (categoryId) => {
  const queryClient = useQueryClient();

  // Запрос для получения конкретной категории по ID
  const categoryQuery = useQuery({
    queryKey: ['categories', categoryId],
    queryFn: () => categoriesAPI.getById(categoryId),
    select: (data) => data.data,
    enabled: !!categoryId,
    // Уменьшаем время кэширования
    staleTime: 10 * 1000, // 10 секунд
    cacheTime: 60 * 1000, // 1 минута
    // Включаем автоматические перезапросы
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    category: categoryQuery.data,
    isLoading: categoryQuery.isLoading,
    isError: categoryQuery.isError,
    error: categoryQuery.error,
    refetch: categoryQuery.refetch,
  };
};

export default useCategories; 