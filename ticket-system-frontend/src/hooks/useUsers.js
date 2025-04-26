import { useQuery } from '@tanstack/react-query';
import { usersAPI } from '../api/api';

export const useUsers = () => {
  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => usersAPI.getBasicInfo(),
    select: (data) => data.data || [],
    onError: (error) => {
      console.error('Error fetching users:', error);
      return [];
    }
  });

  return {
    users: usersQuery.data || [],
    isLoading: usersQuery.isLoading,
    isError: usersQuery.isError,
    error: usersQuery.error,
    getUserById: (id) => usersQuery.data?.find(user => user.id === id) || null
  };
};

export default useUsers; 