import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, TextField, Button,
  FormControl, InputLabel, Select, MenuItem,
  Grid, Alert, CircularProgress, Snackbar,
  Container
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import useCategories from '../hooks/useCategories';

const CreateTicketPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories, isLoading: categoriesLoading } = useCategories({ only_active: true });
  const { createTicket } = useTickets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Состояние формы
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category_id: ''
  });

  // Валидация
  const [formErrors, setFormErrors] = useState({
    title: '',
    description: ''
  });

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Сбросить ошибку для этого поля при изменении
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Валидация формы
  const validateForm = () => {
    let valid = true;
    const errors = {
      title: '',
      description: ''
    };

    if (!formData.title.trim()) {
      errors.title = 'Заголовок обязателен';
      valid = false;
    } else if (formData.title.length < 3) {
      errors.title = 'Заголовок должен содержать не менее 3 символов';
      valid = false;
    }

    if (!formData.description.trim()) {
      errors.description = 'Описание обязательно';
      valid = false;
    } else if (formData.description.length < 10) {
      errors.description = 'Описание должно содержать не менее 10 символов';
      valid = false;
    }

    setFormErrors(errors);
    return valid;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация формы
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Используем метод createTicket из useTickets вместо прямого вызова API
      createTicket(formData, {
        onSuccess: () => {
          setSuccess(true);
          
          // Перенаправление на дашборд вместо списка заявок
          setTimeout(() => {
            navigate('/'); // Перенаправляем на дашборд
          }, 1000);
        },
        onError: (err) => {
          console.error('Ошибка при создании заявки:', err);
          
          // Исправленная обработка ошибки
          if (err.response?.data?.detail) {
            // Проверяем тип данных ошибки
            if (typeof err.response.data.detail === 'object') {
              // Если ошибка - объект с полями, извлекаем сообщение
              if (err.response.data.detail.msg) {
                setError(err.response.data.detail.msg);
              } else {
                // Преобразуем объект ошибки в строку
                setError(JSON.stringify(err.response.data.detail));
              }
            } else {
              // Если ошибка - строка, используем как есть
              setError(err.response.data.detail);
            }
          } else {
            setError('Произошла ошибка при создании заявки. Пожалуйста, попробуйте позже.');
          }
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Необработанная ошибка:', err);
      setError('Произошла непредвиденная ошибка');
      setLoading(false);
    }
  };

  // Закрытие уведомления об успешном создании
  const handleSuccessClose = () => {
    setSuccess(false);
  };

  // Отмена и возврат к списку заявок
  const handleCancel = () => {
    navigate('/tickets');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Создание новой заявки
        </Typography>
      </Box>

      <Paper sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3} justifyContent="center" direction="column" alignItems="center">
            <Grid item xs={12} md={10}>
              <TextField
                fullWidth
                label="Заголовок заявки"
                name="title"
                value={formData.title}
                onChange={handleChange}
                error={!!formErrors.title}
                helperText={formErrors.title}
                required
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={10}>
              <TextField
                fullWidth
                label="Описание проблемы"
                name="description"
                value={formData.description}
                onChange={handleChange}
                error={!!formErrors.description}
                helperText={formErrors.description}
                multiline
                rows={4}
                required
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={10}>
              <FormControl fullWidth disabled={loading} variant="outlined">
                <InputLabel id="priority-label" shrink>Приоритет</InputLabel>
                <Select
                  labelId="priority-label"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  label="Приоритет"
                  notched
                  sx={{ 
                    minHeight: '56px',
                    '& .MuiSelect-select': {
                      paddingTop: '16px',
                      display: 'flex',
                      alignItems: 'center'
                    },
                    '& .MuiInputLabel-root': {
                      background: '#fff',
                      padding: '0 4px'
                    }
                  }}
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={10}>
              <FormControl fullWidth disabled={loading || categoriesLoading} variant="outlined">
                <InputLabel id="category-label" shrink>Категория</InputLabel>
                <Select
                  labelId="category-label"
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  label="Категория"
                  notched
                  displayEmpty
                  sx={{ 
                    minHeight: '56px',
                    '& .MuiSelect-select': {
                      paddingTop: '16px',
                      display: 'flex',
                      alignItems: 'center'
                    },
                    '& .MuiInputLabel-root': {
                      background: '#fff',
                      padding: '0 4px'
                    }
                  }}
                  renderValue={(selected) => {
                    if (!selected) {
                      return <span style={{ color: '#757575' }}>Не выбрана</span>;
                    }
                    const selectedCategory = categories.find(cat => cat.id === selected);
                    return selectedCategory ? selectedCategory.name : 'Не выбрана';
                  }}
                >
                  <MenuItem value="" sx={{ minHeight: '40px' }}>
                    <em>Не выбрана</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id} sx={{ minHeight: '40px' }}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={10} sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
              <Button 
                variant="outlined" 
                onClick={handleCancel}
                disabled={loading}
                size="large"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading}
                size="large"
              >
                {loading ? <CircularProgress size={24} /> : 'Создать заявку'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Уведомление об успешном создании */}
      <Snackbar 
        open={success} 
        autoHideDuration={5000} 
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert 
          elevation={6} 
          variant="filled" 
          severity="success"
          onClose={handleSuccessClose}
        >
          Заявка успешно создана!
        </MuiAlert>
      </Snackbar>
    </Container>
  );
};

export default CreateTicketPage; 