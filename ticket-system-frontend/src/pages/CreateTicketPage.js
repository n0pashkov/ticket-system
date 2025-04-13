import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, TextField, Button,
  FormControl, InputLabel, Select, MenuItem,
  Grid, Alert, CircularProgress, Snackbar
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import { ticketsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import useCategories from '../hooks/useCategories';

const CreateTicketPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories, isLoading: categoriesLoading } = useCategories({ only_active: true });
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
      await ticketsAPI.create(formData);
      setSuccess(true);
      
      // Перенаправление на страницу списка заявок через 1 секунду
      setTimeout(() => {
        navigate('/tickets');
      }, 1000);
    } catch (err) {
      console.error('Ошибка при создании заявки:', err);
      
      // Обработка ошибки
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Произошла ошибка при создании заявки. Пожалуйста, попробуйте позже.');
      }
    } finally {
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
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Создание новой заявки
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
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

            <Grid item xs={12}>
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

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={loading}>
                <InputLabel>Приоритет</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  label="Приоритет"
                >
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={loading || categoriesLoading}>
                <InputLabel>Категория</InputLabel>
                <Select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  label="Категория"
                >
                  <MenuItem value="">
                    <em>Не выбрана</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
              <Button 
                variant="outlined" 
                onClick={handleCancel}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                color="primary"
                disabled={loading}
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
    </Box>
  );
};

export default CreateTicketPage; 