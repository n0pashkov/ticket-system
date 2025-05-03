import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesAPI } from '../api/api';

export const useCategories = (params = {}) => {
  const queryClient = useQueryClient();

  // Запрос на получение всех категорий
  const categoriesQuery = useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoriesAPI.getAll(params),
    select: (data) => data.data || [],
    // Обновляем настройки кэширования для соответствия серверному кэшу
    staleTime: 60 * 60 * 1000, // 1 час, соответствует Cache-Control max-age=3600
    cacheTime: 2 * 60 * 60 * 1000, // 2 часа
    // Отключаем автоматические перезапросы для стабильных данных
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
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
    },
    onError: (error) => {
      console.error('Error updating category:', error);
    }
  });

  // Мутация для удаления категории
  const deleteCategoryMutation = useMutation({
    mutationFn: categoriesAPI.delete,
    onSuccess: () => {
      // Инвалидируем кэши после успешного удаления
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
    }
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    isError: categoriesQuery.isError,
    error: categoriesQuery.error,
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
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
    // Используем долгое кэширование для отдельных категорий
    staleTime: 60 * 60 * 1000, // 1 час
    cacheTime: 2 * 60 * 60 * 1000, // 2 часа
    // Отключаем автоматические перезапросы для стабильных данных
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    category: categoryQuery.data,
    isLoading: categoryQuery.isLoading,
    isError: categoryQuery.isError,
    error: categoryQuery.error,
  };
};

export default useCategories; 