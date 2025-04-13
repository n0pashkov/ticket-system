import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, TextField, Button, Paper, Box, Alert, CircularProgress, Grid } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

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
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            Вход в систему заявок
          </Typography>
          
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
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
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? <CircularProgress size={24} /> : 'Войти'}
            </Button>
            
            {/* Инструменты диагностики */}
            <Typography variant="h6" component="h2" sx={{ mt: 3, mb: 2 }}>
              Диагностика соединения
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={checkBackendStatus}
                  disabled={backendStatus?.loading}
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
                severity={backendStatus.success ? "success" : "error"}
                sx={{ mt: 2, mb: 2 }}
              >
                {backendStatus.message}
              </Alert>
            )}
            
            {authTestResult && !authTestResult.loading && (
              <Alert 
                severity={authTestResult.success ? "success" : "error"}
                sx={{ mt: 2 }}
              >
                {authTestResult.message}
                {authTestResult.details && (
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.8em', marginTop: '8px' }}>
                    {JSON.stringify(authTestResult.details, null, 2)}
                  </pre>
                )}
              </Alert>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage; 