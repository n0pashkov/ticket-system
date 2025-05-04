import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, TextField, Button,
  FormControl, InputLabel, Select, MenuItem,
  Alert, CircularProgress, Snackbar, IconButton,
  Card, CardContent, Avatar, Divider, useTheme, useMediaQuery,
  List, ListItem, ListItemText, ListItemIcon, Checkbox
} from '@mui/material';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import useCategories from '../hooks/useCategories';
import { useEquipmentByCategory } from '../hooks/useEquipment';

// Иконки
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NoteAddIcon from '@mui/icons-material/NoteAdd';
import FlagIcon from '@mui/icons-material/Flag';
import CategoryIcon from '@mui/icons-material/Category';
import SendIcon from '@mui/icons-material/Send';
import ComputerIcon from '@mui/icons-material/Computer';

// Константы для цветов
const priorityColors = {
  'low': '#8bc34a',
  'medium': '#ffa726',
  'high': '#f44336'
};

const CreateTicketPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { categories, isLoading: categoriesLoading } = useCategories({ only_active: true });
  const { createTicket } = useTickets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Состояние формы
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category_id: '',
    room_number: '',
    equipment_id: null
  });

  // Получаем оборудование для выбранной категории
  const { equipment, isLoading: equipmentLoading, isError: equipmentError } = useEquipmentByCategory(formData.category_id);
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  // Для отладки - выводим информацию о выбранной категории 
  const selectedCategoryInfo = useMemo(() => {
    if (!formData.category_id || !categories) return null;
    
    const category = categories.find(cat => cat.id === formData.category_id);
    return category ? {
      id: category.id,
      name: category.name,
      description: category.description
    } : null;
  }, [formData.category_id, categories]);

  useEffect(() => {
    if (selectedCategoryInfo) {
      console.log('Выбранная категория:', selectedCategoryInfo);
    }
  }, [selectedCategoryInfo]);

  // Валидация
  const [formErrors, setFormErrors] = useState({
    title: '',
    description: '',
    category_id: '',
    room_number: ''
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

    // Сбросить общую ошибку при выборе категории
    if (name === 'category_id' && value) {
      setError('');
      // Сбрасываем выбранное оборудование при смене категории
      setSelectedEquipment(null);
      setFormData(prev => ({
        ...prev,
        equipment_id: null
      }));
    }
  };

  // Валидация формы
  const validateForm = () => {
    let valid = true;
    const errors = {
      title: '',
      description: '',
      category_id: '',
      room_number: ''
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

    if (!formData.category_id) {
      errors.category_id = 'Выбор категории обязателен';
      valid = false;
      setError('Необходимо выбрать категорию');
    }
    
    if (!formData.room_number.trim()) {
      errors.room_number = 'Номер кабинета обязателен';
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
    navigate('/');
  };

  // Получение названия выбранной категории
  const getSelectedCategoryName = () => {
    if (!formData.category_id || !categories || categories.length === 0) return "Не выбрана";
    const category = categories.find(cat => cat.id === formData.category_id);
    return category ? category.name : "Не выбрана";
  };

  // Обработчик выбора оборудования
  const handleEquipmentSelect = (equipmentId) => {
    console.log('Выбрано оборудование с ID:', equipmentId);
    setSelectedEquipment(equipmentId);
    setFormData(prev => ({
      ...prev,
      equipment_id: equipmentId
    }));
  };

  // Добавляем эффект для отладки
  useEffect(() => {
    if (formData.category_id) {
      console.log('Изменилась выбранная категория:', formData.category_id);
    }
  }, [formData.category_id]);

  // Добавляем эффект для отладки оборудования
  useEffect(() => {
    console.log('Текущий список оборудования:', equipment);
  }, [equipment]);

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100vw', 
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box',
      p: 2
    }}>
      {/* Заголовок и кнопка назад */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        width: '100%'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            color="primary" 
            onClick={handleCancel}
            sx={{ 
              mr: 1,
              backgroundColor: 'rgba(25, 118, 210, 0.08)'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Новая заявка
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        {/* Информационная карточка */}
        <Card sx={{ 
          mb: 3,
          borderRadius: 4, 
          background: 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)',
          color: 'white',
          boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
        }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Avatar 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  bgcolor: 'white', 
                  color: '#2196f3',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}
              >
                <NoteAddIcon fontSize="large" />
              </Avatar>
              <Box sx={{ ml: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  Создание заявки
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.95rem' }}>
                  Опишите вашу проблему или запрос
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Поля ввода */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            variant="outlined"
            label="Заголовок заявки"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={!!formErrors.title}
            helperText={formErrors.title}
            required
            disabled={loading}
            sx={{ 
              mb: 3, 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
            InputProps={{
              sx: { borderRadius: 2 }
            }}
          />

          <TextField
            fullWidth
            label="Описание проблемы"
            name="description"
            value={formData.description}
            onChange={handleChange}
            error={!!formErrors.description}
            helperText={formErrors.description}
            multiline
            rows={isMobile ? 4 : 6}
            required
            disabled={loading}
            sx={{ 
              mb: 3,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              } 
            }}
            InputProps={{
              sx: { borderRadius: 2 }
            }}
          />
          
          <TextField
            fullWidth
            variant="outlined"
            label="Номер кабинета"
            name="room_number"
            value={formData.room_number}
            onChange={handleChange}
            disabled={loading}
            error={!!formErrors.room_number}
            helperText={formErrors.room_number}
            required
            sx={{ 
              mb: 3, 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
            InputProps={{
              sx: { borderRadius: 2 }
            }}
            placeholder="Например: 101, 202A"
          />
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
            gap: 2,
            mb: 3
          }}>
            <Card sx={{ 
              borderRadius: 3, 
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: 'none',
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <FlagIcon color="action" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Приоритет
                  </Typography>
                </Box>
                <FormControl fullWidth disabled={loading} variant="outlined" size="small">
                  <Select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    displayEmpty
                    sx={{ 
                      borderRadius: 2,
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: priorityColors[formData.priority] + '80',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: priorityColors[formData.priority],
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: priorityColors[formData.priority],
                      },
                    }}
                  >
                    <MenuItem value="low">Низкий</MenuItem>
                    <MenuItem value="medium">Средний</MenuItem>
                    <MenuItem value="high">Высокий</MenuItem>
                  </Select>
                </FormControl>
              </CardContent>
            </Card>

            <Card sx={{ 
              borderRadius: 3, 
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: 'none',
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                  <CategoryIcon color="action" sx={{ mr: 1 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Категория
                  </Typography>
                </Box>
                <FormControl 
                  fullWidth 
                  disabled={loading || categoriesLoading} 
                  variant="outlined" 
                  size="small"
                  error={!!formErrors.category_id}
                >
                  <Select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    displayEmpty
                    sx={{ borderRadius: 2 }}
                    renderValue={(selected) => {
                      return getSelectedCategoryName();
                    }}
                  >
                    <MenuItem value="" disabled>
                      <em>Выберите категорию</em>
                    </MenuItem>
                    {categories && categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.category_id && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {formErrors.category_id}
                    </Typography>
                  )}
                </FormControl>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Оборудование - показываем после выбора категории */}
        {formData.category_id && (
          <Card sx={{ 
            mb: 3, 
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <ComputerIcon color="action" sx={{ mr: 1 }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Выберите оборудование{selectedCategoryInfo ? ` - ${selectedCategoryInfo.name}` : ''}
                </Typography>
              </Box>
              
              {equipmentLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    Загрузка оборудования...
                  </Typography>
                </Box>
              ) : equipmentError ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Ошибка при загрузке оборудования. Пожалуйста, попробуйте другую категорию.
                </Alert>
              ) : equipment.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', my: 2 }}>
                  Нет доступного оборудования для категории "{selectedCategoryInfo?.name || 'выбранной категории'}"
                </Typography>
              ) : (
                <List dense sx={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {equipment.map((item) => (
                    <ListItem 
                      key={item.id}
                      dense
                      button
                      onClick={() => handleEquipmentSelect(item.id)}
                      sx={{
                        borderRadius: 1,
                        mb: 0.5,
                        border: selectedEquipment === item.id 
                          ? `1px solid ${theme.palette.primary.main}` 
                          : `1px solid ${theme.palette.divider}`,
                        backgroundColor: selectedEquipment === item.id 
                          ? 'rgba(25, 118, 210, 0.08)' 
                          : 'transparent',
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedEquipment === item.id}
                          tabIndex={-1}
                          disableRipple
                          inputProps={{ 'aria-labelledby': `equipment-${item.id}` }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        id={`equipment-${item.id}`}
                        primary={item.name || "Оборудование без названия"}
                        secondary={`${item.type || "Тип не указан"} • ${item.location || "Место не указано"}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        )}

        {/* Кнопки действий */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2
        }}>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={handleCancel}
            disabled={loading}
            startIcon={<ArrowBackIcon />}
            sx={{ 
              borderRadius: 2, 
              py: 1.2,
              width: { xs: '100%', sm: 'auto' },
              order: { xs: 2, sm: 1 }
            }}
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
            endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            sx={{ 
              borderRadius: 2, 
              py: 1.2,
              width: { xs: '100%', sm: 'auto' },
              order: { xs: 1, sm: 2 },
              boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
            }}
          >
            {loading ? 'Отправка...' : 'Отправить заявку'}
          </Button>
        </Box>
      </form>

      {/* Уведомление об успешном создании */}
      <Snackbar 
        open={success} 
        autoHideDuration={5000} 
        onClose={handleSuccessClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSuccessClose} severity="success" variant="filled">
          Заявка успешно создана! Перенаправление...
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateTicketPage; 