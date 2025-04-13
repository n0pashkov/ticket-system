import axios from 'axios';

// Явно задаем localhost для всех запросов, игнорируя переменные окружения
const baseURL = 'http://localhost:8000/api/v1';

// Create an axios instance
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
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
    return Promise.reject(error);
  }
);

// Добавим интерцептор для обработки ошибок ответа
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Логируем ошибки для отладки
    console.error('API Error:', error.response?.status, error.response?.data);
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
    });
  },
  // В данном API регистрация не предусмотрена через отдельный метод
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  getCurrent: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return Promise.reject(new Error('Токен не найден'));
    }
    
    // Используем существующий эндпоинт с trailing slash, как он определен в бэкенде
    return api.get('/users/me/');
  },
};

export const ticketsAPI = {
  getAll: (filters = {}) => {
    console.log(">>> DEBUG: Calling getAll tickets with baseURL:", baseURL);
    console.log(">>> DEBUG: Calling getAll tickets with token:", localStorage.getItem('token')?.slice(0, 10) + "...");
    
    return api.get('/tickets/')
      .then(response => {
        console.log(">>> DEBUG: getAll success:", response.data.length, "tickets");
        return response;
      })
      .catch(error => {
        console.error(">>> DEBUG: getAll error:", error.message, error.response?.status, error.response?.data);
        throw error;
      });
  },
  getById: (id) => api.get(`/tickets/${id}`),
  create: (ticketData) => api.post('/tickets/', ticketData),
  update: (id, ticketData) => api.put(`/tickets/${id}`, ticketData),
  delete: (id) => api.delete(`/tickets/${id}`),
  
  // Дополнительные методы API
  assign: (ticketId, agentId) => api.put(`/tickets/${ticketId}/assign/${agentId}`, {}),
  selfAssign: (ticketId) => api.post(`/tickets/${ticketId}/assign`, {}),
  updateStatus: (ticketId, status) => api.put(`/tickets/${ticketId}/status/${status}`, {}),
  closeTicket: (ticketId) => api.post(`/tickets/${ticketId}/close`, {}),
  reopenTicket: (ticketId) => api.post(`/tickets/${ticketId}/reopen`, {}),
  
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
  getTicketStats: () => {
    const token = localStorage.getItem('token');
    return axios.get('/statistics/tickets-summary', {
      baseURL: 'http://localhost:8000/api/v1',
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });
  },
  getAgentPerformance: (days = 30) => {
    const token = localStorage.getItem('token');
    return axios.get(`/statistics/agent-performance?days=${days}`, {
      baseURL: 'http://localhost:8000/api/v1',
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });
  },
  getTicketsByPeriod: (period = 'month') => {
    const token = localStorage.getItem('token');
    return axios.get(`/statistics/tickets-by-period?period=${period}`, {
      baseURL: 'http://localhost:8000/api/v1',
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });
  },
  getUserActivity: (top = 10) => {
    const token = localStorage.getItem('token');
    return axios.get(`/statistics/user-activity?top=${top}`, {
      baseURL: 'http://localhost:8000/api/v1',
      maxRedirects: 5,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : undefined
      }
    });
  },
};

export default api; 