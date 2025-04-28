import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';

// Создаем контекст для темы
const ThemeContext = createContext();

// Хук для использования темы в компонентах
export const useThemeMode = () => useContext(ThemeContext);

// Провайдер темы
export const ThemeModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  // Создаем светлую тему
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: '#f5f7fa',
        paper: '#ffffff',
      },
    },
  });

  // Создаем темную тему
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#90caf9',
      },
      secondary: {
        main: '#f48fb1',
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
      text: {
        primary: '#ffffff',
        secondary: '#b0b0b0',
      },
    },
  });

  // Выбираем текущую тему
  const theme = darkMode ? darkTheme : lightTheme;

  // Загружаем сохраненную тему при монтировании компонента
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme) {
      setDarkMode(savedTheme === 'true');
    }
  }, []);

  // Функция для переключения темы
  const toggleTheme = () => {
    const newThemeValue = !darkMode;
    setDarkMode(newThemeValue);
    localStorage.setItem('darkMode', String(newThemeValue));
  };

  // Значение контекста
  const contextValue = {
    darkMode,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeModeProvider; 