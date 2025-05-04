import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

export const useTickets = (filters = {}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Добавляем идентификатор пользователя в фильтры, если он доступен
  const combinedFilters = { ...filters };
  if (user?.id) {
    // Некоторые API могут поддерживать фильтрацию по user_id на стороне сервера
    combinedFilters.user_id = user.id;
  }

  // Проверяем, есть ли путь в фильтрах (старый способ фильтрации)
  // и преобразуем его в параметры запроса
  if (combinedFilters.path === '/new' || combinedFilters.path === 'new') {
    delete combinedFilters.path;
    combinedFilters.status = 'new';
  } else if (combinedFilters.path === '/in_progress' || combinedFilters.path === 'in_progress') {
    delete combinedFilters.path;
    combinedFilters.status = 'in_progress';
  } else if (combinedFilters.path === '/closed' || combinedFilters.path === 'closed') {
    delete combinedFilters.path;
    combinedFilters.status = 'closed';
  }

  const ticketsQuery = useQuery({
    queryKey: ['tickets', combinedFilters],
    queryFn: () => {
      console.log('Вызов API для получения заявок с фильтрами:', combinedFilters);
      return ticketsAPI.getAll(combinedFilters);
    },
    select: (data) => {
      console.log('Получены данные о заявках:', data);
      if (!data || !data.data) {
        console.error('Некорректный формат данных заявок:', data);
        return [];
      }
      return data.data || [];
    },
    // Обновленные настройки кэширования для более быстрого отклика
    staleTime: 10 * 1000, // 10 секунд вместо 1 минуты
    cacheTime: 30 * 60 * 1000, // 30 минут
    // Включаем обновление при монтировании, фокусе окна и восстановлении соединения
    refetchOnMount: true,
    refetchOnWindowFocus: true, // Обновляем при возвращении на вкладку
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000, // Обновляем каждые 30 секунд
    onError: (error) => {
      console.error('Ошибка при получении заявок:', error);
      console.error('Детали ошибки:', error.response?.status, error.response?.data);
      return [];
    }
  });

  const ticketMutation = useMutation({
    mutationFn: ticketsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error creating ticket:', error);
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => ticketsAPI.update(id, data),
    onSuccess: (_, variables) => {
      // Обновляем кэш конкретной заявки
      queryClient.invalidateQueries({ queryKey: ['tickets', variables.id] });
      // Инвалидируем общий список заявок
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error updating ticket:', error);
    }
  });

  const deleteTicketMutation = useMutation({
    mutationFn: ticketsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error deleting ticket:', error);
    }
  });

  const assignTicketMutation = useMutation({
    mutationFn: ({ ticketId, agentId }) => ticketsAPI.assign(ticketId, agentId),
    onSuccess: (_, variables) => {
      // Обновляем кэш конкретной заявки
      queryClient.invalidateQueries({ queryKey: ['tickets', variables.ticketId] });
      // Инвалидируем общий список заявок
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error assigning ticket:', error);
    }
  });

  const selfAssignTicketMutation = useMutation({
    mutationFn: (ticketId) => ticketsAPI.selfAssign(ticketId),
    onSuccess: (response, variables) => {
      // Оптимистичное обновление данных в кэше
      const newTicket = response.data;
      
      // Обновляем данные в кэше немедленно, не дожидаясь повторного запроса
      queryClient.setQueryData(['tickets', variables], newTicket);
      
      // Обновляем список всех заявок
      queryClient.setQueriesData(['tickets'], (oldData) => {
        if (!oldData) return oldData;
        
        // Находим и обновляем заявку в списке
        const updatedData = Array.isArray(oldData) ? 
          oldData.map(ticket => ticket.id === variables ? newTicket : ticket) : oldData;
        
        return updatedData;
      });
      
      // Немедленно инвалидируем кэши для принудительного обновления
      queryClient.invalidateQueries({ queryKey: ['tickets', variables], refetchActive: true });
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchActive: true });
    },
    onError: (error) => {
      console.error('Error self-assigning ticket:', error);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }) => ticketsAPI.updateStatus(ticketId, status),
    onSuccess: (response, variables) => {
      const newTicket = response.data;
      
      // Обновляем данные в кэше немедленно
      queryClient.setQueryData(['tickets', variables.ticketId], newTicket);
      
      // Обновляем список всех заявок
      queryClient.setQueriesData(['tickets'], (oldData) => {
        if (!oldData) return oldData;
        
        // Находим и обновляем заявку в списке
        const updatedData = Array.isArray(oldData) ? 
          oldData.map(ticket => ticket.id === variables.ticketId ? newTicket : ticket) : oldData;
        
        return updatedData;
      });
      
      // Принудительное обновление с сервера
      queryClient.invalidateQueries({ queryKey: ['tickets', variables.ticketId], refetchActive: true });
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchActive: true });
    },
    onError: (error) => {
      console.error('Error updating ticket status:', error);
    }
  });

  const closeTicketMutation = useMutation({
    mutationFn: (ticketId) => ticketsAPI.closeTicket(ticketId),
    onSuccess: (response, variables) => {
      const newTicket = response.data;
      
      // Обновляем данные в кэше немедленно
      queryClient.setQueryData(['tickets', variables], newTicket);
      
      // Обновляем список всех заявок
      queryClient.setQueriesData(['tickets'], (oldData) => {
        if (!oldData) return oldData;
        
        // Находим и обновляем заявку в списке
        const updatedData = Array.isArray(oldData) ? 
          oldData.map(ticket => ticket.id === variables ? newTicket : ticket) : oldData;
        
        return updatedData;
      });
      
      // Принудительное обновление данных с сервера
      queryClient.invalidateQueries({ queryKey: ['tickets', variables], refetchActive: true });
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchActive: true });
    },
    onError: (error) => {
      console.error('Error closing ticket:', error);
    }
  });

  // Добавляем мутацию для закрытия заявки с сообщением
  const closeTicketWithMessageMutation = useMutation({
    mutationFn: ({ ticketId, message }) => ticketsAPI.closeTicketWithMessage(ticketId, message),
    onSuccess: (response, variables) => {
      const newTicket = response.data;
      
      // Оптимистично обновляем данные в кэше сразу
      queryClient.setQueryData(['tickets', variables.ticketId], newTicket);
      
      // Обновляем список всех заявок
      queryClient.setQueriesData(['tickets'], (oldData) => {
        if (!oldData) return oldData;
        
        // Находим и обновляем заявку в списке
        const updatedData = Array.isArray(oldData) ? 
          oldData.map(ticket => ticket.id === variables.ticketId ? newTicket : ticket) : oldData;
        
        return updatedData;
      });
      
      // Принудительное обновление всех связанных данных
      queryClient.invalidateQueries({ queryKey: ['tickets', variables.ticketId], refetchActive: true });
      queryClient.invalidateQueries({ queryKey: ['tickets'], refetchActive: true });
      queryClient.invalidateQueries({ queryKey: ['messages', variables.ticketId], refetchActive: true });
    },
    onError: (error) => {
      console.error('Error closing ticket with message:', error);
    }
  });

  // Функция создания заявки
  const createTicket = (ticketData, options = {}) => {
    const { onSuccess, onError } = options;
    
    // Глубокое копирование данных заявки, чтобы избежать мутаций
    const processedData = JSON.parse(JSON.stringify(ticketData));
    
    // Добавляем поле equipment_id, если оно есть в данных
    if (processedData.equipment_id) {
      // Оно уже есть в данных формы, не нужно дополнительной обработки
    } else {
      // Если equipment_id не указан, удаляем это поле
      delete processedData.equipment_id;
    }
    
    // Отправляем запрос на создание заявки
    ticketsAPI.create(processedData)
      .then(response => {
        // Инвалидируем кэши запросов по заявкам
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        
        // Если нужно получить свежий список после создания
        queryClient.refetchQueries({ queryKey: ['tickets', 'list'] });
        
        // Выполняем callback onSuccess, если он предоставлен
        if (typeof onSuccess === 'function') {
          onSuccess(response);
        }
      })
      .catch(error => {
        console.error('Ошибка при создании заявки:', error);
        
        // Выполняем callback onError, если он предоставлен
        if (typeof onError === 'function') {
          onError(error);
        }
      });
  };

  return {
    tickets: ticketsQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    isError: ticketsQuery.isError,
    error: ticketsQuery.error,
    createTicket: createTicket,
    updateTicket: updateTicketMutation.mutate,
    deleteTicket: deleteTicketMutation.mutate,
    assignTicket: assignTicketMutation.mutate,
    selfAssignTicket: selfAssignTicketMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    closeTicket: closeTicketMutation.mutate,
    closeTicketWithMessage: closeTicketWithMessageMutation.mutate,
  };
};

export const useTicket = (ticketId) => {
  const queryClient = useQueryClient();
  
  const ticketQuery = useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: () => ticketsAPI.getById(ticketId),
    select: (data) => data.data || null,
    enabled: !!ticketId,
    // Обновляем настройки кэширования для более быстрого отклика
    staleTime: 10 * 1000, // 10 секунд вместо 1 минуты
    cacheTime: 3 * 60 * 1000, // 3 минуты вместо 5
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 20 * 1000, // Обновляем каждые 20 секунд
    onError: (error) => {
      console.error(`Error fetching ticket ${ticketId}:`, error);
      return null;
    }
  });

  return {
    ticket: ticketQuery.data,
    isLoading: ticketQuery.isLoading,
    isError: ticketQuery.isError,
    error: ticketQuery.error,
  };
};

// Добавляем новый хук для сообщений заявки
export const useTicketMessages = (ticketId) => {
  const queryClient = useQueryClient();
  
  const messagesQuery = useQuery({
    queryKey: ['messages', ticketId],
    queryFn: () => ticketsAPI.getMessages(ticketId),
    select: (data) => data.data || [],
    enabled: !!ticketId,
    // Настройки кэширования для сообщений
    staleTime: 30 * 1000, // 30 секунд - сообщения могут обновляться чаще
    cacheTime: 5 * 60 * 1000, // 5 минут
    onError: (error) => {
      console.error(`Error fetching messages for ticket ${ticketId}:`, error);
      return [];
    }
  });

  // Функция для добавления сообщения в кэш
  const addMessage = (message) => {
    queryClient.setQueryData(['messages', ticketId], (old) => {
      if (!old || !old.data) return { data: [message] };
      return {
        ...old,
        data: [...old.data, message]
      };
    });
  };

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    isError: messagesQuery.isError,
    error: messagesQuery.error,
    addMessage,
  };
}; 