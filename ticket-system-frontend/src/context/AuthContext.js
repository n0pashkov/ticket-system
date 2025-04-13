import React, { createContext, useState, useContext, useEffect } from 'react';
import { usersAPI, authAPI } from '../api/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Проверяем токен и получаем информацию о пользователе при инициализации
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Получаем информацию о текущем пользователе
          const response = await usersAPI.getCurrent();
          setUser(response.data);
        } catch (err) {
          console.error('Failed to fetch user data:', err);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (userData) => {
    try {
      // Сбрасываем ошибку при новой попытке логина
      setError(null);
      
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
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 