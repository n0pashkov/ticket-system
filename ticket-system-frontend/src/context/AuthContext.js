import React, { createContext, useState, useContext, useEffect } from 'react';
import { usersAPI, authAPI, clearAuthData } from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Проверяем токен и получаем информацию о пользователе при инициализации
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (token) {
        try {
          // Получаем информацию о текущем пользователе
          const response = await usersAPI.getCurrent();
          console.log('User data retrieved successfully:', response.data);
          setUser(response.data);
        } catch (err) {
          console.error('Failed to fetch user data:', err);
          
          // Проверяем статус ошибки
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            console.error('Authentication token expired or invalid');
            clearAuthData(); // Очистка токена и кэша
            setError('Необходимо войти в систему заново');
          } else {
            // Ограничиваем число повторных попыток для предотвращения циклов
            const retryCount = parseInt(localStorage.getItem('auth_retry_count') || '0');
            if (retryCount < 2) {
              // Увеличиваем счетчик попыток
              localStorage.setItem('auth_retry_count', (retryCount + 1).toString());
              
              // Даем небольшую задержку перед повторной попыткой
              setTimeout(() => {
                checkAuth();
              }, 1000);
              return;
            } else {
              // Сбрасываем счетчик попыток после превышения лимита
              localStorage.removeItem('auth_retry_count');
              // Другие ошибки API
              setError('Ошибка получения данных пользователя');
            }
          }
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    // Сбрасываем счетчик попыток при первой загрузке
    localStorage.removeItem('auth_retry_count');
    checkAuth();
    
    // Добавляем обработчик события для перезагрузки страницы
    const handleBeforeUnload = () => {
      // Сохраняем важную информацию в sessionStorage, которая сохраняется при обновлении страницы
      if (user) {
        sessionStorage.setItem('user_data_backup', JSON.stringify(user));
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Пытаемся восстановить данные из sessionStorage при перезагрузке
    const restoreUserData = () => {
      const savedData = sessionStorage.getItem('user_data_backup');
      if (savedData && !user) {
        try {
          const userData = JSON.parse(savedData);
          // Временно устанавливаем данные до получения актуальных
          setUser(userData);
        } catch (e) {
          console.error('Failed to restore user data from session storage', e);
        }
      }
    };
    
    restoreUserData();
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = async (userData) => {
    try {
      // Сбрасываем ошибку при новой попытке логина
      setError(null);
      setLoading(true);
      
      console.log('Attempting login with:', userData.email);
      
      // Получаем токен
      const response = await authAPI.login(userData);
      const { access_token } = response.data;
      
      console.log('Token received successfully');
      
      // Сохраняем токен
      localStorage.setItem('token', access_token);
      
      try {
        console.log('Fetching user data with token');
        // Получаем информацию о пользователе
        const userResponse = await usersAPI.getCurrent();
        console.log('User data received:', userResponse.data);
        
        // Сохраняем данные пользователя
        const userData = userResponse.data;
        setUser(userData);
        
        // Также сохраняем в sessionStorage для восстановления при перезагрузке
        sessionStorage.setItem('user_data_backup', JSON.stringify(userData));
        
        setLoading(false);
        
        // Не перезагружаем страницу, возвращаем успешный результат
        
        return { success: true };
      } catch (userErr) {
        console.error('Error fetching user data:', userErr);
        console.error('Error details:', userErr.response?.status, userErr.response?.data);
        
        // Извлекаем читаемое сообщение об ошибке
        let errorMessage = 'Ошибка при получении данных пользователя';
        
        if (userErr.response?.data) {
          // FastAPI возвращает ошибки в разных форматах
          const errorData = userErr.response.data;
          
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.detail) {
            // Проверяем, является ли detail строкой или объектом
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              // Если это массив ошибок валидации, берем первое сообщение
              errorMessage = errorData.detail[0]?.msg || errorMessage;
            }
          }
        }
        
        setError(errorMessage);
        setLoading(false);
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      console.error('Login error:', err);
      
      // Извлекаем читаемое сообщение об ошибке
      let errorMessage = 'Ошибка при входе. Проверьте логин и пароль.';
      
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
      }
      
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const refreshUserData = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getCurrent();
      setUser(response.data);
      // Обновляем резервную копию в sessionStorage
      sessionStorage.setItem('user_data_backup', JSON.stringify(response.data));
      setError(null);
    } catch (err) {
      console.error('Failed to refresh user data:', err);
      if (err.response && err.response.status === 401) {
        // Если сессия истекла, разлогиниваем пользователя
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Вызываем API для логирования выхода, если есть токен
      if (localStorage.getItem('token')) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Ошибка при выходе из системы:', error);
    } finally {
      // Очищаем состояние пользователя и токен в любом случае
      setUser(null);
      // Используем функцию для очистки токена и кэша
      clearAuthData();
      // Также очищаем sessionStorage
      sessionStorage.removeItem('user_data_backup');
      setError(null);
    }
    
    // Не перезагружаем страницу, React Router сам перенаправит на /login
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      loading, 
      error, 
      refreshUserData,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 