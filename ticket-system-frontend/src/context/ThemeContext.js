import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material';

// Создаем контекст для темы
const ThemeContext = createContext();

// Хук для использования темы в компонентах
export const useThemeMode = () => useContext(ThemeContext);

// Провайдер темы
export const ThemeModeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  // Базовые настройки компонентов для обеих тем
  const baseComponents = {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
        contained: {
          boxShadow: '0 4px 10px rgba(33, 150, 243, 0.25)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: 'rgba(33, 150, 243, 0.05)',
          fontWeight: 600,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        },
      },
    },
  };

  // Базовые общие настройки типографики
  const baseTypography = {
    fontFamily: [
      'Inter',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 600,
    },
  };

  // Создаем светлую тему
  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#2196f3', // Основной синий
        light: '#64b5f6',
        dark: '#1976d2'
      },
      secondary: {
        main: '#f50057', // Акцентный розовый
      },
      background: {
        default: '#f5f7fa', // Светло-серый фон
        paper: '#ffffff',   // Белый фон для карточек
      },
      error: {
        main: '#f44336',
      },
      warning: {
        main: '#ffa726',
      },
      success: {
        main: '#66bb6a',
      },
      info: {
        main: '#29b6f6',
      },
    },
    typography: baseTypography,
    shape: {
      borderRadius: 8,
    },
    components: baseComponents,
  });

  // Создаем темную тему
  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#90caf9',
        light: '#b3e5fc',
        dark: '#5d99c6'
      },
      secondary: {
        main: '#f48fb1',
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
      error: {
        main: '#f44336',
      },
      warning: {
        main: '#ffa726',
      },
      success: {
        main: '#66bb6a',
      },
      info: {
        main: '#29b6f6',
      },
      text: {
        primary: '#ffffff',
        secondary: '#b0b0b0',
      },
    },
    typography: baseTypography,
    shape: {
      borderRadius: 8,
    },
    components: {
      ...baseComponents,
      // Переопределяем некоторые стили для темной темы
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: 'rgba(144, 202, 249, 0.08)',
            fontWeight: 600,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          },
        },
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