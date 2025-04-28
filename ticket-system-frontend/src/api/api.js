import axios from 'axios';

// Явно задаем localhost для всех запросов, игнорируя переменные окружения
const baseURL = 'http://localhost:8000/api/v1';

// Create an axios instance
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Добавляем таймаут для запросов
  timeout: 10000,
});

// Add interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // FastAPI ожидает формат "Bearer {token}"
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Включаем обработку редиректов
    config.maxRedirects = 5;
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Добавим интерцептор для обработки ошибок ответа
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Логируем ошибки для отладки
    console.error('API Error:', error.response?.status, error.response?.data);
    
    // Если получаем 401 Unauthorized, значит токен истек или недействителен
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized access detected, clearing token');
      localStorage.removeItem('token');
    }
    
    return Promise.reject(error);
  }
);

// Исправляем URL для API аутентификации
const authBaseURL = 'http://localhost:8000';

// API endpoints
export const authAPI = {
  login: (credentials) => {
    // В FastAPI используется форма x-www-form-urlencoded для логина
    const formData = new URLSearchParams();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    return axios.post('/api/v1/auth/token', formData, {
      baseURL: authBaseURL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 5000,
    });
  },
  // В данном API регистрация не предусмотрена через отдельный метод
};

// API для получения данных пользователей
export const usersAPI = {
  getAll: (params = {}) => api.get('/users/', { params }),
  getById: (id) => api.get(`/users/${id}/`),
  getCurrent: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('Попытка получить данные пользователя без токена');
      return Promise.reject(new Error('Токен не найден'));
    }
    
    console.log('Запрос текущего пользователя с токеном:', token ? 'Токен есть' : 'Токен отсутствует');
    
    // Используем существующий эндпоинт с trailing slash, как он определен в бэкенде
    return api.get('/users/me/')
      .then(response => {
        console.log('Получены данные пользователя:', response.data);
        return response;
      })
      .catch(error => {
        console.error('Ошибка получения данных пользователя:', error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Детали ошибки:', error.response?.data);
        throw error;
      });
  },
  getBasicInfo: () => api.get('/users/basic'),
  create: (userData) => api.post('/users/', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
};

// API для работы с заявками
export const ticketsAPI = {
  getAll: (filters = {}) => {
    console.log(">>> DEBUG: Calling getAll tickets with baseURL:", baseURL);
    console.log(">>> DEBUG: API token:", localStorage.getItem('token') ? 'Токен есть' : 'Токен отсутствует');
    console.log(">>> DEBUG: Filters:", filters);
    
    // Создаем копию фильтров и удаляем undefined значения
    const cleanFilters = { ...filters };
    Object.keys(cleanFilters).forEach(key => {
      if (cleanFilters[key] === undefined) {
        delete cleanFilters[key];
      }
    });
    
    return api.get('/tickets/', { params: cleanFilters })
      .then(response => {
        console.log(">>> DEBUG: Получены заявки:", response.data);
        
        // Для каждой заявки выводим структуру полей, связанных с пользователем
        if (Array.isArray(response.data) && response.data.length > 0) {
          response.data.forEach((ticket, index) => {
            const userRelatedFields = {
              id: ticket.id,
              requester_id: ticket.requester_id,
              created_by_id: ticket.created_by_id,
              user_id: ticket.user_id,
              author_id: ticket.author_id,
              requester: ticket.requester,
              created_by: ticket.created_by
            };
            console.log(`Заявка ${index + 1} (${ticket.id}) - поля, связанные с пользователем:`, userRelatedFields);
          });
        }
        
        // Проверяем, что ответ содержит данные в правильном формате
        if (!response.data || !Array.isArray(response.data)) {
          console.warn(">>> WARNING: Неожиданный формат данных при получении заявок:", response.data);
        }
        
        return {
          ...response,
          data: Array.isArray(response.data) ? response.data : []
        };
      })
      .catch(error => {
        console.error(">>> ERROR: Ошибка при получении заявок:", error.message);
        console.error(">>> ERROR: Статус ошибки:", error.response?.status);
        console.error(">>> ERROR: Детали ошибки:", error.response?.data);
        throw error;
      });
  },
  getById: (id) => api.get(`/tickets/${id}`),
  create: (ticketData) => {
    console.log('Создание заявки с данными:', ticketData);
    return api.post('/tickets/', ticketData)
      .then(response => {
        console.log('Заявка успешно создана:', response.data);
        return response;
      })
      .catch(error => {
        console.error('Ошибка при создании заявки:', error);
        console.error('Статус ошибки:', error.response?.status);
        console.error('Детали ошибки:', error.response?.data);
        throw error;
      });
  },
  update: (id, ticketData) => api.put(`/tickets/${id}`, ticketData),
  delete: (id) => api.delete(`/tickets/${id}`),
  
  // Дополнительные методы API
  assign: (ticketId, agentId) => api.put(`/tickets/${ticketId}/assign/${agentId}`, {}),
  selfAssign: (ticketId) => api.post(`/tickets/${ticketId}/assign`, {}),
  updateStatus: (ticketId, status) => api.put(`/tickets/${ticketId}/status/${status}`, {}),
  closeTicket: (ticketId) => api.post(`/tickets/${ticketId}/close`, {}),
  
  // Комментарии к тикетам
  getComments: (ticketId) => api.get(`/tickets/${ticketId}/comments/`),
  addComment: (ticketId, commentData) => api.post(`/tickets/${ticketId}/comments/`, commentData),
};

// API для категорий заявок
export const categoriesAPI = {
  getAll: (params = {}) => api.get('/categories/', { params }),
  getById: (id) => api.get(`/categories/${id}`),
  create: (categoryData) => api.post('/categories/', categoryData),
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  delete: (id) => api.delete(`/categories/${id}`),
};

// API для статистики
export const statisticsAPI = {
  getTicketStats: () => api.get('/statistics/tickets-summary'),
  getAgentPerformance: (days = 30) => api.get(`/statistics/agent-performance?days=${days}`),
  getTicketsByPeriod: (period = 'month') => api.get(`/statistics/tickets-by-period?period=${period}`),
  getUserActivity: (top = 10) => api.get(`/statistics/user-activity?top=${top}`),
};

export default api;