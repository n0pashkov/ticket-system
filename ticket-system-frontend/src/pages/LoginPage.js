import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Typography, Box, TextField, Button, 
  Card, CardContent, Alert, CircularProgress, 
  Grid, Avatar, Container, Divider
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// Иконки
import LockIcon from '@mui/icons-material/Lock';
import EmailIcon from '@mui/icons-material/Email';
import BugReportIcon from '@mui/icons-material/BugReport';
import ApiIcon from '@mui/icons-material/Api';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [backendStatus, setBackendStatus] = useState(null);
  const [authTestResult, setAuthTestResult] = useState(null);
  
  const navigate = useNavigate();
  const { login, error: authError, user } = useAuth();

  // Перенаправляем на главную, если пользователь уже авторизован
  useEffect(() => {
    if (user) {
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
    
    try {
      const result = await login(formData);
      if (result.success) {
        navigate('/');
      } else {
        setFormError(result.error);
      }
    } catch (err) {
      console.error('Login form error:', err);
      setFormError('Произошла ошибка при входе. Пожалуйста, попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция для проверки статуса бэкенда
  const checkBackendStatus = async () => {
    setBackendStatus({ loading: true });
    try {
      // Проверяем корневой URL бэкенда
      const rootResponse = await axios.get('http://localhost:8000/');
      console.log('Backend root response:', rootResponse.data);
      
      // Проверяем доступность Swagger UI - это гарантированно должно работать в FastAPI
      const swaggerResponse = await axios.get('http://localhost:8000/docs', { 
        validateStatus: (status) => status < 500 // Принимаем любой статус < 500 как успешный
      });
      console.log('Swagger docs available:', swaggerResponse.status === 200);
      
      // Проверяем API версию 1
      try {
        const apiV1Response = await axios.get('http://localhost:8000/api/v1', { 
          validateStatus: (status) => status < 500
        });
        console.log('API v1 response:', apiV1Response.data);
      } catch (apiError) {
        console.log('API v1 check failed:', apiError.message);
      }
      
      setBackendStatus({
        success: true,
        message: 'Бэкенд работает. Посмотрите консоль для деталей.'
      });
    } catch (error) {
      console.error('Backend status check error:', error);
      setBackendStatus({
        success: false,
        message: `Ошибка соединения с бэкендом: ${error.message}`
      });
    }
  };

  // Функция для тестирования API авторизации
  const testAuthAPI = async () => {
    setAuthTestResult({ loading: true });
    
    try {
      // Попытка прямого доступа к API токенов
      const formData = new URLSearchParams();
      formData.append('username', 'admin');  // Пробуем с тестовым пользователем
      formData.append('password', 'admin');
      
      const authResponse = await axios.post(
        'http://localhost:8000/api/v1/auth/token', 
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          validateStatus: (status) => true, // Принимаем любой статус ответа для анализа
        }
      );
      
      console.log('Auth API Test Response:', authResponse);
      
      if (authResponse.status === 200 && authResponse.data.access_token) {
        // Токен получен успешно, проверяем доступ к защищенным ресурсам
        try {
          const userResponse = await axios.get(
            'http://localhost:8000/api/v1/users/me/',
            {
              headers: {
                'Authorization': `Bearer ${authResponse.data.access_token}`
              },
              validateStatus: (status) => true,
            }
          );
          
          console.log('User API Test Response:', userResponse);
          
          if (userResponse.status === 200) {
            setAuthTestResult({
              success: true,
              message: 'API авторизации работает корректно. Токен получен, данные пользователя доступны.'
            });
          } else {
            setAuthTestResult({
              success: false,
              message: `Токен получен, но доступ к данным пользователя не работает. Статус: ${userResponse.status}`,
              details: userResponse.data
            });
          }
        } catch (userError) {
          console.error('User API Test Error:', userError);
          setAuthTestResult({
            success: false,
            message: `Токен получен, но ошибка при доступе к данным пользователя: ${userError.message}`
          });
        }
      } else {
        setAuthTestResult({
          success: false,
          message: `Ошибка получения токена. Статус: ${authResponse.status}`,
          details: authResponse.data
        });
      }
    } catch (error) {
      console.error('Auth API Test Error:', error);
      setAuthTestResult({
        success: false,
        message: `Ошибка тестирования API авторизации: ${error.message}`
      });
    }
  };

  // Определяем сообщение об ошибке для отображения
  const errorMessage = formError || authError;

  return (
    <Box sx={{ 
      width: '100%', 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 2
    }}>
      <Container maxWidth="sm">
        <Card sx={{ 
          borderRadius: 4, 
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
          <CardContent sx={{ p: 4 }}>
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
                required
                fullWidth
                id="email"
                label="Email или имя пользователя"
                name="email"
                autoComplete="email"
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
              
              {/* Инструменты диагностики */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Диагностика соединения
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={checkBackendStatus}
                    disabled={backendStatus?.loading}
                    startIcon={<BugReportIcon />}
                    sx={{ 
                      borderRadius: 2, 
                      py: 1,
                      height: '100%'
                    }}
                  >
                    {backendStatus?.loading ? 
                      <CircularProgress size={24} /> : 
                      'Проверить бэкенд'
                    }
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={testAuthAPI}
                    disabled={authTestResult?.loading}
                    color="secondary"
                    startIcon={<ApiIcon />}
                    sx={{ 
                      borderRadius: 2, 
                      py: 1,
                      height: '100%'
                    }}
                  >
                    {authTestResult?.loading ? 
                      <CircularProgress size={24} /> : 
                      'Тест API входа'
                    }
                  </Button>
                </Grid>
              </Grid>
              
              {backendStatus && !backendStatus.loading && (
                <Alert 
                  severity={backendStatus.success ? 'success' : 'error'} 
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  {backendStatus.message}
                </Alert>
              )}
              
              {authTestResult && !authTestResult.loading && (
                <Alert 
                  severity={authTestResult.success ? 'success' : 'error'} 
                  sx={{ mt: 2, borderRadius: 2 }}
                >
                  {authTestResult.message}
                </Alert>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default LoginPage; 