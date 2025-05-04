import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, Box, TextField, Button, 
  Card, CardContent, Alert, CircularProgress, 
  Avatar, Container, useTheme
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { clearAuthData } from '../api/api'; // Импортируем функцию для очистки кэша

// Иконки
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [sessionError, setSessionError] = useState('');
  
  const navigate = useNavigate();
  const { login, error: authError, user } = useAuth();
  const theme = useTheme();

  // Очищаем кэш и сессию при загрузке страницы входа и проверяем наличие ошибки сессии
  useEffect(() => {
    // Очищаем токен и кэш при загрузке страницы логина
    // чтобы предотвратить проблемы с авторизацией
    clearAuthData();
    
    // Проверяем, есть ли сообщение об ошибке аутентификации в sessionStorage
    const authErrorMessage = sessionStorage.getItem('auth_error');
    if (authErrorMessage) {
      console.log('Обнаружена ошибка аутентификации:', authErrorMessage);
      setSessionError(authErrorMessage);
      // Удаляем сообщение после получения, чтобы оно не отображалось повторно
      sessionStorage.removeItem('auth_error');
    }
  }, []);

  // Устанавливаем цвет фона для body при монтировании компонента
  useEffect(() => {
    const originalColor = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme.palette.background.default;
    
    // Возвращаем оригинальный цвет при размонтировании
    return () => {
      document.body.style.backgroundColor = originalColor;
    };
  }, [theme.palette.background.default]);

  // Перенаправляем на главную, если пользователь уже авторизован
  useEffect(() => {
    if (user) {
      console.log('Пользователь авторизован, перенаправление на главную страницу');
      navigate('/');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError('');
    setSessionError('');
    
    try {
      const result = await login(formData);
      if (!result.success) {
        setFormError(result.error);
      }
      // Не делаем перенаправление здесь, useEffect выполнит его при обновлении user
    } catch (err) {
      console.error('Login form error:', err);
      setFormError('Произошла ошибка при входе. Пожалуйста, попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Определяем сообщение об ошибке для отображения (приоритет у ошибки сессии)
  const errorMessage = sessionError || formError || authError;

  return (
    <Box sx={{ 
      width: '100%', 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2,
      bgcolor: 'background.default'
    }}>
      <Container maxWidth="sm">
        <Card sx={{ 
          borderRadius: 4, 
          overflow: 'hidden',
          boxShadow: (theme) => `0 4px 20px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'}`,
          bgcolor: 'background.paper'
        }}>
          <CardContent sx={{ p: 4, bgcolor: 'background.paper' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  bgcolor: 'primary.main', 
                  color: 'white',
                  boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
                }}
              >
                <LockIcon fontSize="large" />
              </Avatar>
              <Box sx={{ ml: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Вход в систему
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Система управления заявками
                </Typography>
              </Box>
            </Box>
          
            {errorMessage && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {errorMessage}
              </Alert>
            )}
          
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                margin="normal"
                fullWidth
                id="email"
                label="Имя пользователя"
                name="email"
                autoComplete="username"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  startAdornment: (
                    <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  ),
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Пароль"
                type="password"
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={isSubmitting}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
                InputProps={{
                  sx: { borderRadius: 2 },
                  startAdornment: (
                    <LockIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  ),
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isSubmitting}
                sx={{ 
                  mt: 2, 
                  mb: 3, 
                  py: 1.2,
                  borderRadius: 2,
                  fontWeight: 600,
                  boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
                }}
              >
                {isSubmitting ? <CircularProgress size={24} /> : 'Войти'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage; 