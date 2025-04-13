import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesAPI } from '../api/api';

export const useCategories = (params = {}) => {
  const queryClient = useQueryClient();

  // Запрос на получение всех категорий
  const categoriesQuery = useQuery({
    queryKey: ['categories', params],
    queryFn: () => categoriesAPI.getAll(params),
    select: (data) => data.data || [],
    onError: (error) => {
      console.error('Error fetching categories:', error);
      return [];
    }
  });

  // Мутация для создания новой категории
  const createCategoryMutation = useMutation({
    mutationFn: categoriesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      console.error('Error creating category:', error);
    }
  });

  // Мутация для обновления категории
  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => categoriesAPI.update(id, data),
    onSuccess: () => {
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

export default useCategories; 