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
            // Другие ошибки API
            setError('Ошибка получения данных пользователя');
          }
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    };

    checkAuth();
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
        setUser(userResponse.data);
        setLoading(false);
        
        // Перезагружаем страницу, чтобы гарантировать чистое состояние
        window.location.href = '/';
        
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

  const logout = () => {
    setUser(null);
    // Используем функцию для очистки токена и кэша
    clearAuthData();
    setError(null);
    
    // Перезагружаем страницу для полной очистки состояния
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 