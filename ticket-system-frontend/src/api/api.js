import axios from 'axios';

// Явно задаем localhost для всех запросов, игнорируя переменные окружения
const baseURL = 'http://localhost:8000/api/v1';

// Create an axios instance
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    // Убираем no-cache заголовки, чтобы разрешить кэширование
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
    
    // Добавляем заголовки для кэширования в зависимости от типа запроса
    if (config.method === 'get') {
      // Проверяем, если это запрос для пользовательских данных - отключаем кэширование
      if (config.url.includes('/users/me')) {
        // Для данных о пользователе никогда не используем кэш, чтобы избежать проблем с авторизацией
        config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        config.headers['Pragma'] = 'no-cache';
        config.headers['Expires'] = '0';
      }
      // Для GET-запросов разрешаем кэширование
      else if (config.url.includes('/categories')) {
        // Для категорий используем долгое кэширование, т.к. они редко меняются
        config.headers['Cache-Control'] = 'max-age=3600, stale-while-revalidate=120';
      } else if (config.url.includes('/statistics')) {
        // Для статистики используем короткое кэширование
        config.headers['Cache-Control'] = 'max-age=600, stale-while-revalidate=60';
      } else {
        // Для остальных GET-запросов используем умеренное кэширование
        config.headers['Cache-Control'] = 'max-age=60, stale-while-revalidate=30';
      }
    } else {
      // Для остальных методов (POST, PUT, DELETE) запрещаем кэширование
      config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      config.headers['Pragma'] = 'no-cache';
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
  (response) => {
    // Сохраняем заголовки кэширования из ответа для последующего использования
    if (response.headers['cache-control']) {
      console.debug('Server cache headers:', response.headers['cache-control']);
    }
    return response;
  },
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

// Функция для очистки авторизационных данных
export const clearAuthData = () => {
  localStorage.removeItem('token');
  
  // Очищаем кэш для API запросов, связанных с авторизацией
  if (window.caches) {
    caches.keys().then(names => {
      names.forEach(name => {
        caches.delete(name);
      });
    });
  }
};

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
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
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
    return api.get('/users/me/', {
      headers: {
        // Принудительно отключаем кэширование для запросов профиля
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
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
  create: (userData) => {
    // Если email пустой, установим его в null
    const processedData = { ...userData };
    if (processedData.email === '') {
      processedData.email = null;
    }
    return api.post('/users/', processedData);
  },
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  // Новый метод для смены пароля через специальный эндпоинт
  changePassword: (newPassword, currentPassword) => api.post('/users/me/change-password', {
    new_password: newPassword,
    current_password: currentPassword
  }),
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
    
    // Добавляем случайный параметр для предотвращения кэширования
    cleanFilters._nocache = new Date().getTime();
    
    return api.get('/tickets/', { 
      params: cleanFilters,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
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
  getById: (id) => api.get(`/tickets/${id}`, {
    params: { _nocache: new Date().getTime() },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
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
  assign: (ticketId, agentId) => api.put(`/tickets/${ticketId}/assign/${agentId}`, {}, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
  
  selfAssign: (ticketId) => api.post(`/tickets/${ticketId}/assign`, {}, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
  
  updateStatus: (ticketId, status) => api.put(`/tickets/${ticketId}/status/${status}`, {}, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
  
  closeTicket: (ticketId) => api.post(`/tickets/${ticketId}/close`, {}, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
  // Новый метод для закрытия заявки с сообщением
  closeTicketWithMessage: (ticketId, message) => api.post(`/tickets/${ticketId}/close-with-message`, { message }, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
  // Получение сообщений заявки
  getMessages: (ticketId) => api.get(`/tickets/${ticketId}/messages`, {
    params: { _nocache: new Date().getTime() },
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  }),
  // Получение количества сообщений для заявки
  getMessageCount: (ticketId) => api.get(`/tickets/${ticketId}/messages/count`),
};

// API для категорий заявок
export const categoriesAPI = {
  getAll: (params = {}) => api.get('/categories/', { 
    params,
    headers: {
      // Для категорий явно указываем долгое кэширование
      'Cache-Control': 'max-age=3600, stale-while-revalidate=120'
    }
  }),
  getById: (id) => api.get(`/categories/${id}`, {
    headers: {
      'Cache-Control': 'max-age=3600, stale-while-revalidate=120'
    }
  }),
  create: (categoryData) => api.post('/categories/', categoryData, {
    headers: {
      'Cache-Control': 'no-store'
    }
  }),
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData, {
    headers: {
      'Cache-Control': 'no-store'
    }
  }),
  delete: (id) => api.delete(`/categories/${id}`, {
    headers: {
      'Cache-Control': 'no-store'
    }
  }),
};

// API для статистики
export const statisticsAPI = {
  getTicketStats: () => api.get('/statistics/tickets-summary', {
    headers: {
      // Для статистики разрешаем кэширование на умеренное время
      'Cache-Control': 'max-age=600, stale-while-revalidate=60'
    }
  }),
  getAgentPerformance: (days = 30) => api.get(`/statistics/agent-performance?days=${days}`, {
    headers: {
      'Cache-Control': 'max-age=600, stale-while-revalidate=60'
    }
  }),
  getTicketsByPeriod: (period = 'month') => api.get(`/statistics/tickets-by-period?period=${period}`, {
    headers: {
      'Cache-Control': 'max-age=600, stale-while-revalidate=60'
    }
  }),
  getUserActivity: (top = 10) => api.get(`/statistics/user-activity?top=${top}`, {
    headers: {
      'Cache-Control': 'max-age=600, stale-while-revalidate=60'
    }
  }),
};

export default api;