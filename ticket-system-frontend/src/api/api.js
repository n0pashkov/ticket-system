import axios from 'axios';

// Явно задаем localhost для всех запросов, игнорируя переменные окружения
const baseURL = 'http://localhost:8000/api/v1';

// Create an axios instance
export const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
    // Убираем no-cache заголовки, чтобы разрешить кэширование
  },
  // Увеличиваем таймаут для запросов
  timeout: 30000,
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
        // Добавляем случайный параметр для обхода кэша
        if (!config.params) config.params = {};
        config.params._nocache = new Date().getTime();
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
      
      // Вызываем функцию очистки данных авторизации
      clearAuthData();
      
      // Если пользователь пытался получить свои данные, перезагружаем страницу
      // для перенаправления на страницу входа
      if (error.config.url.includes('/users/me')) {
        console.log('Session expired, redirecting to login...');
        // Добавляем сообщение в sessionStorage
        sessionStorage.setItem('auth_error', 'Сессия истекла. Пожалуйста, войдите снова.');
        
        // Если мы не на странице входа, перенаправляем
        if (!window.location.pathname.includes('/login')) {
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Исправляем URL для API аутентификации
const authBaseURL = 'http://localhost:8000';

// Функция для очистки авторизационных данных
export const clearAuthData = () => {
  // Очищаем localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('auth_retry_count');
  
  // Очищаем sessionStorage, относящийся к авторизации
  sessionStorage.removeItem('user_data_backup');
  
  // Очищаем кэш для API запросов, связанных с авторизацией
  if (window.caches) {
    caches.keys().then(names => {
      names.forEach(name => {
        // Избирательно очищаем кэш только относящийся к API вызовам
        if (name.includes('api') || name.includes('http')) {
          console.log('Clearing cache:', name);
          caches.delete(name);
        }
      });
    }).catch(err => {
      console.error('Failed to clear caches:', err);
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
  
  logout: () => {
    return api.post('/auth/logout', {});
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
    
    // Проверяем, является ли фильтр путем или параметром запроса
    let url = '/tickets/';
    
    // Если в фильтрах указан статус, который начинается с '/', 
    // это означает, что запрос был отправлен неправильно
    // В этом случае нужно преобразовать его в параметр запроса
    if (cleanFilters.path && typeof cleanFilters.path === 'string') {
      // Если запрошен статус через путь, преобразуем его в параметр запроса
      if (cleanFilters.path === '/new') {
        // Удаляем путь и создаем параметр status
        delete cleanFilters.path;
        cleanFilters.status = 'new';
      } else {
        // Если это другой путь, используем его
        url = `/tickets${cleanFilters.path}`;
        delete cleanFilters.path;
      }
    }
    
    return api.get(url, { 
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
  getById: (id) => {
    // Если ID равен 'new', это означает, что мы хотим получить форму для создания новой заявки
    // Возвращаем пустой объект, чтобы избежать запроса к API
    if (id === 'new') {
      console.log('Запрос формы для создания новой заявки');
      return Promise.resolve({ 
        data: {
          id: 'new',
          title: '',
          description: '',
          status: 'new',
          priority: 'medium',
          creator_id: null,
          assigned_to_id: null,
          created_at: null,
          updated_at: null
        } 
      });
    }
    
    // Обычный запрос для получения существующей заявки по ID
    return api.get(`/tickets/${id}`, {
      params: { _nocache: new Date().getTime() },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },
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
    params: {
      ...params,
      show_all: params.show_all || false, // По умолчанию показываем только активные (show_all=false)
      // Добавляем случайную строку для обхода кэширования
      nocache: new Date().getTime() 
    },
    headers: {
      // Уменьшаем время кэширования для быстрого обновления данных
      'Cache-Control': 'max-age=10, stale-while-revalidate=5'
    }
  }),
  getById: (id) => api.get(`/categories/${id}`, {
    headers: {
      'Cache-Control': 'max-age=10, stale-while-revalidate=5'
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

// API для работы с оборудованием
export const equipmentAPI = {
  getAll: (params = {}) => {
    // Добавляем случайный параметр для предотвращения кэширования
    const nocacheParams = { 
      ...params,
      _nocache: new Date().getTime() 
    };
    return api.get('/equipment/', { 
      params: nocacheParams,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },
  getById: (id) => api.get(`/equipment/${id}`),
  getByCategory: (categoryId) => {
    // Логируем входные данные
    console.log("API getByCategory вызван с categoryId:", categoryId, "Тип:", typeof categoryId);
    
    // Определяем параметры запроса
    const params = { 
      // Если categoryId - число или строка, которую можно преобразовать в число, используем category_id
      ...(typeof categoryId === 'number' || !isNaN(Number(categoryId)) 
        ? { category_id: Number(categoryId) } 
        : { type: categoryId }),
      // Добавляем параметр для предотвращения кэширования
      nocache: new Date().getTime() 
    };
    
    console.log("Параметры запроса:", params);
    
    // Выполняем запрос с расширенной обработкой ответа/ошибок
    return api.get('/equipment/', { 
      params,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
      .then(response => {
        console.log("Ответ API на getByCategory:", response.data);
        return response;
      })
      .catch(error => {
        console.error("Ошибка в getByCategory:", error.response?.data || error.message);
        throw error;
      });
  },
  getCategories: () => api.get('/equipment/categories'),
  getLocations: () => api.get('/equipment/locations'),
  create: (data) => api.post('/equipment/', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  addMaintenance: (id, data) => api.post(`/equipment/${id}/maintenance`, data),
  getHistory: (id) => api.get(`/equipment/${id}/history`),
};

// API для аудит-логов
export const auditLogsAPI = {
  // Получение списка аудит-логов с возможностью фильтрации
  getAll: (params = {}) => {
    // Чистим undefined значения
    const cleanParams = { ...params };
    Object.keys(cleanParams).forEach(key => {
      if (cleanParams[key] === undefined) {
        delete cleanParams[key];
      }
    });
    
    // Добавляем параметр для обхода кэша - для логов важны актуальные данные
    cleanParams._nocache = new Date().getTime();
    
    return api.get('/audit-logs/', { 
      params: cleanParams,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  },
  
  // Получение уникальных значений типов действий
  getActionTypes: () => {
    return api.get('/audit-logs/action-types', {
      headers: {
        'Cache-Control': 'max-age=3600'  // Эти данные можно кэшировать
      }
    });
  }
};

// API для работы с журналом аудита
export const auditAPI = {
  getAll: (params = {}) => {
    // Очищаем параметры от пустых значений
    const cleanParams = { ...params };
    Object.keys(cleanParams).forEach(key => {
      if (cleanParams[key] === undefined || cleanParams[key] === '') {
        delete cleanParams[key];
      }
    });
    
    console.log('Отправляем запрос к API аудита с параметрами:', cleanParams);
    
    return api.get('/audit-logs/', { 
      params: cleanParams,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      // Увеличиваем таймаут конкретно для запроса аудит-логов
      timeout: 40000
    })
    .then(response => {
      console.log('Успешно получены данные аудита:', response.data.length, 'записей');
      return response;
    })
    .catch(error => {
      console.error('Ошибка при получении данных аудита:', error.message);
      if (error.code === 'ECONNABORTED') {
        console.error('Превышено время ожидания ответа от сервера (таймаут)');
      } else if (error.response) {
        console.error('Статус ошибки:', error.response.status);
        console.error('Сообщение сервера:', error.response.data);
      } else if (error.request) {
        console.error('Ошибка запроса, ответ не получен:', error.request);
      }
      throw error;
    });
  },
  getById: (id) => api.get(`/audit-logs/${id}`),
  // WebSocket соединение будет настраиваться отдельно
};

export default api;