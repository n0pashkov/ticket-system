import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogsAPI } from '../api/api';

export const useAuditLogs = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [logs, setLogs] = useState([]);
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Получение списка логов с использованием React Query
  const auditLogsQuery = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditLogsAPI.getAll(filters),
    select: (data) => data.data || [],
    staleTime: 10 * 1000,        // 10 секунд (данные быстро устаревают)
    refetchInterval: 30 * 1000,  // Обновляем каждые 30 секунд
    refetchOnWindowFocus: true   // Обновляем при возврате на вкладку
  });
  
  // Соединение WebSocket для получения обновлений в реальном времени
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/v1/audit-logs/ws`;
      
      // Параметр роли для фильтрации на сервере
      const roleParam = filters.role ? `?role_filter=${filters.role}` : '';
      
      const setupWebSocket = () => {
        wsRef.current = new WebSocket(`${wsUrl}${roleParam}`);
        
        wsRef.current.onopen = () => {
          console.log('WebSocket соединение установлено');
          setIsConnected(true);
        };
        
        wsRef.current.onmessage = (event) => {
          try {
            const newLog = JSON.parse(event.data);
            
            // Проверяем соответствие фильтрам
            let matchesFilters = true;
            
            if (filters.action_type && newLog.action_type !== filters.action_type) {
              matchesFilters = false;
            }
            
            if (filters.entity_type && newLog.entity_type !== filters.entity_type) {
              matchesFilters = false;
            }
            
            if (filters.entity_id && newLog.entity_id !== filters.entity_id) {
              matchesFilters = false;
            }
            
            if (filters.user_id && (!newLog.user || newLog.user.id !== filters.user_id)) {
              matchesFilters = false;
            }
            
            // Если фильтр по роли изменился, отправляем новый фильтр на сервер
            if (filters.role && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ role_filter: filters.role }));
            }
            
            // Добавляем лог в начало списка, если он соответствует фильтрам
            if (matchesFilters) {
              setLogs(prevLogs => [newLog, ...prevLogs]);
            }
          } catch (e) {
            console.error('Ошибка при обработке сообщения WebSocket:', e);
          }
        };
        
        wsRef.current.onclose = (event) => {
          console.log('WebSocket соединение закрыто:', event);
          setIsConnected(false);
          
          // Пытаемся переподключиться через 3 секунды
          setTimeout(() => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) {
              setupWebSocket();
            }
          }, 3000);
        };
        
        wsRef.current.onerror = (error) => {
          console.error('Ошибка WebSocket:', error);
        };
      };
      
      setupWebSocket();
      
      // Очистка при размонтировании
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [filters.role]);
  
  // Объединяем данные из запроса и WebSocket
  useEffect(() => {
    if (auditLogsQuery.data) {
      // При получении новых данных, обновляем список
      setLogs(auditLogsQuery.data);
    }
  }, [auditLogsQuery.data]);
  
  // Функция изменения фильтров
  const updateFilters = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    
    // Если изменился фильтр по роли, обновляем WebSocket
    if (newFilters.role !== filters.role && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ role_filter: newFilters.role }));
    }
  };
  
  // Сброс фильтров
  const resetFilters = () => {
    setFilters({});
    
    // Сбрасываем фильтр по роли в WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ role_filter: null }));
    }
  };
  
  return {
    logs,                  // Актуальные логи (объединены из HTTP и WebSocket)
    isLoading: auditLogsQuery.isLoading,
    isError: auditLogsQuery.isError,
    error: auditLogsQuery.error,
    filters,               // Текущие фильтры
    updateFilters,         // Функция изменения фильтров
    resetFilters,          // Функция сброса фильтров
    isConnected            // Статус WebSocket соединения
  };
}; 