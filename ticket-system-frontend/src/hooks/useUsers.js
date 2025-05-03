import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersAPI } from '../api/api';

export const useUsers = () => {
  const queryClient = useQueryClient();
  
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getBasicInfo(),
    select: (data) => data.data || [],
    // Обновляем настройки кэширования для пользователей
    staleTime: 15 * 60 * 1000, // 15 минут
    cacheTime: 30 * 60 * 1000, // 30 минут
    // Отключаем автоматические перезапросы для стабильных данных
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    onError: (error) => {
      console.error('Error fetching users:', error);
      return [];
    }
  });

  // Мутация для создания пользователя
  const createUserMutation = useMutation({
    mutationFn: (userData) => usersAPI.create(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Error creating user:', error);
    }
  });

  // Мутация для обновления пользователя
  const updateUserMutation = useMutation({
    mutationFn: ({ id, userData }) => usersAPI.update(id, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Error updating user:', error);
    }
  });

  // Мутация для удаления пользователя
  const deleteUserMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('Error deleting user:', error);
    }
  });

  // Мутация для смены пароля
  const changePasswordMutation = useMutation({
    mutationFn: ({ newPassword, currentPassword }) => 
      usersAPI.changePassword(newPassword, currentPassword),
    // Не инвалидируем кэш пользователей при смене пароля,
    // т.к. это не влияет на список пользователей
    onError: (error) => {
      console.error('Error changing password:', error);
    }
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    getUserById: (id) => usersQuery.data?.find(user => user.id === id) || null,
    createUser: createUserMutation.mutate,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    changePassword: changePasswordMutation.mutate,
  };
};

export default useUsers; 