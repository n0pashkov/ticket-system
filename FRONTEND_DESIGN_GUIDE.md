# Руководство по дизайну frontend-части системы заявок

Данное руководство описывает принципы дизайна, компоненты и паттерны, используемые в frontend-части системы заявок. Следуйте этим рекомендациям при создании новых страниц и компонентов для обеспечения единообразия интерфейса.

## Содержание
1. [Общие принципы](#общие-принципы)
2. [Библиотеки и компоненты](#библиотеки-и-компоненты)
3. [Цветовая палитра](#цветовая-палитра)
4. [Типография](#типография)
5. [Стили компонентов](#стили-компонентов)
   - [Карточки](#карточки)
   - [Кнопки](#кнопки)
   - [Формы](#формы)
   - [Таблицы](#таблицы)
   - [Уведомления](#уведомления)
6. [Структура страницы](#структура-страницы)
7. [Адаптивность](#адаптивность)
8. [Тёмная тема](#тёмная-тема)
9. [Шаблоны компонентов](#шаблоны-компонентов)

## Общие принципы

1. **Единообразие** — придерживайтесь единого стиля во всем приложении
2. **Отзывчивость** — интерфейс должен адаптироваться под все размеры экранов
3. **Обратная связь** — пользователь должен получать мгновенную обратную связь на свои действия
4. **Доступность** — интерфейс должен быть удобен для всех пользователей, включая людей с ограниченными возможностями
5. **Простота** — избегайте лишних элементов, которые отвлекают пользователя

## Библиотеки и компоненты

Основные библиотеки:
- **Material UI** — основная библиотека компонентов
- **React Router** — для навигации
- **React Query** — для управления состоянием и запросами
- **Material Icons** — для иконок

Импорты компонентов Material UI:
```jsx
import {
  Typography, Box, Card, CardContent, 
  Button, TextField, CircularProgress,
  Grid, Divider, Chip, Avatar,
  Dialog, Alert, Snackbar
} from '@mui/material';
```

## Цветовая палитра

Основная цветовая схема:

```javascript
// Светлая тема
const lightTheme = {
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
  }
}

// Статусы заявок
const statusColors = {
  'new': '#ffa726',      // Оранжевый
  'in_progress': '#29b6f6', // Синий
  'closed': '#66bb6a'    // Зеленый
};

// Приоритеты заявок
const priorityColors = {
  'low': '#8bc34a',    // Зеленый
  'medium': '#ffa726', // Оранжевый
  'high': '#f44336'    // Красный
};

// Роли пользователей
const roleColors = {
  'admin': '#f44336',  // Красный
  'agent': '#2196f3',  // Синий
  'user': '#4caf50'    // Зеленый
};
```

## Типография

Основные стили текста:

```jsx
// Заголовки страниц
<Typography 
  variant="h5" 
  sx={{ 
    fontWeight: 600,
    mb: 2
  }}
>
  Заголовок страницы
</Typography>

// Заголовки секций
<Typography 
  variant="h6" 
  sx={{ 
    fontWeight: 600,
    mb: 1.5
  }}
>
  Заголовок секции
</Typography>

// Подзаголовки
<Typography 
  variant="subtitle1" 
  sx={{ 
    fontWeight: 500,
    color: 'text.secondary'
  }}
>
  Подзаголовок
</Typography>

// Обычный текст
<Typography variant="body1">
  Основной текст
</Typography>

// Вспомогательный текст
<Typography 
  variant="body2" 
  color="text.secondary"
>
  Вспомогательный текст
</Typography>
```

## Стили компонентов

### Карточки

**Стандартная карточка:**
```jsx
<Card 
  sx={{ 
    mb: 2, 
    borderRadius: 3, 
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
  }}
>
  <CardContent sx={{ p: 2.5 }}>
    {/* Содержимое карточки */}
  </CardContent>
</Card>
```

**Карточка с акцентом (например, детали заявки):**
```jsx
<Card 
  sx={{ 
    mb: 3, 
    borderRadius: 4, 
    background: 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)',
    color: 'white',
    boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
  }}
>
  <CardContent sx={{ p: 2.5 }}>
    {/* Содержимое карточки */}
  </CardContent>
</Card>
```

**Карточка заявки (с индикатором приоритета):**
```jsx
<Card 
  sx={{ 
    mb: 2, 
    borderRadius: 3, 
    overflow: 'hidden',
    border: `1px solid #f0f0f0`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }
  }}
  onClick={onClick}
>
  <Box 
    sx={{ 
      width: '100%', 
      height: 6, 
      backgroundColor: priorityColors[ticket.priority] || '#ccc' 
    }} 
  />
  <CardContent sx={{ p: 2 }}>
    {/* Содержимое карточки */}
  </CardContent>
</Card>
```

### Кнопки

**Основная кнопка:**
```jsx
<Button
  variant="contained"
  color="primary"
  sx={{ 
    borderRadius: 2,
    textTransform: 'none',
    fontWeight: 600,
    boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
  }}
>
  Текст кнопки
</Button>
```

**Второстепенная кнопка:**
```jsx
<Button
  variant="outlined"
  color="primary"
  sx={{ 
    borderRadius: 2,
    textTransform: 'none',
    fontWeight: 500
  }}
>
  Текст кнопки
</Button>
```

**Кнопка с иконкой:**
```jsx
<Button
  variant="contained"
  color="primary"
  startIcon={<AddIcon />}
  sx={{ 
    borderRadius: 2,
    textTransform: 'none',
    fontWeight: 600
  }}
>
  Добавить
</Button>
```

**Иконка-кнопка:**
```jsx
<IconButton 
  size="small" 
  color="primary"
  sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)' }}
>
  <EditIcon fontSize="small" />
</IconButton>
```

**Плавающая кнопка (FAB):**
```jsx
<Fab
  color="primary"
  aria-label="add"
  sx={{
    position: 'fixed',
    bottom: 16,
    right: 16,
    boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)'
  }}
>
  <AddIcon />
</Fab>
```

### Формы

**Текстовое поле:**
```jsx
<TextField
  fullWidth
  label="Название"
  name="title"
  value={formData.title}
  onChange={handleChange}
  margin="normal"
  sx={{ 
    mb: 2,
    '& .MuiOutlinedInput-root': {
      borderRadius: 2
    }
  }}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <TitleIcon sx={{ color: 'text.secondary' }} />
      </InputAdornment>
    ),
  }}
/>
```

**Выпадающий список:**
```jsx
<FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
  <InputLabel id="priority-label">Приоритет</InputLabel>
  <Select
    labelId="priority-label"
    id="priority"
    name="priority"
    value={formData.priority}
    onChange={handleChange}
    sx={{ 
      borderRadius: 2 
    }}
  >
    <MenuItem value="low">Низкий</MenuItem>
    <MenuItem value="medium">Средний</MenuItem>
    <MenuItem value="high">Высокий</MenuItem>
  </Select>
</FormControl>
```

**Многострочное текстовое поле:**
```jsx
<TextField
  fullWidth
  label="Описание"
  name="description"
  value={formData.description}
  onChange={handleChange}
  multiline
  rows={4}
  margin="normal"
  sx={{ 
    mb: 2,
    '& .MuiOutlinedInput-root': {
      borderRadius: 2
    }
  }}
/>
```

### Таблицы

**Стилизованная таблица:**
```jsx
<TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
  <Table>
    <TableHead>
      <TableRow sx={{ backgroundColor: 'rgba(33, 150, 243, 0.05)' }}>
        <TableCell sx={{ fontWeight: 600 }}>Название</TableCell>
        <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
        <TableCell sx={{ fontWeight: 600 }}>Приоритет</TableCell>
        <TableCell sx={{ fontWeight: 600 }}>Действия</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      {items.map((item) => (
        <TableRow 
          key={item.id}
          sx={{ 
            cursor: 'pointer',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
          }}
          onClick={() => handleRowClick(item.id)}
        >
          <TableCell>{item.title}</TableCell>
          <TableCell>
            <Chip 
              label={formatStatus(item.status)} 
              size="small"
              sx={{ 
                bgcolor: getStatusColor(item.status),
                color: 'white',
                fontWeight: 500
              }}
            />
          </TableCell>
          <TableCell>
            <Chip 
              label={formatPriority(item.priority)} 
              size="small"
              sx={{ 
                bgcolor: getPriorityColor(item.priority),
                color: 'white',
                fontWeight: 500
              }}
            />
          </TableCell>
          <TableCell>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" color="primary">
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</TableContainer>
```

### Уведомления

**Уведомление (Snackbar):**
```jsx
<Snackbar
  open={!!successMessage}
  autoHideDuration={5000}
  onClose={() => setSuccessMessage('')}
  anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
>
  <Alert 
    onClose={() => setSuccessMessage('')} 
    severity="success" 
    variant="filled"
    sx={{ borderRadius: 2 }}
  >
    {successMessage}
  </Alert>
</Snackbar>
```

**Сообщение об ошибке:**
```jsx
{errorMessage && (
  <Alert 
    severity="error" 
    sx={{ mb: 3, borderRadius: 2 }}
  >
    {errorMessage}
  </Alert>
)}
```

**Модальное окно подтверждения:**
```jsx
<Dialog
  open={openDialog}
  onClose={() => setOpenDialog(false)}
  maxWidth="sm"
  fullWidth
  PaperProps={{
    sx: { borderRadius: 3 }
  }}
>
  <DialogTitle sx={{ fontWeight: 600 }}>
    Подтверждение действия
  </DialogTitle>
  <DialogContent>
    <DialogContentText>
      Вы уверены, что хотите выполнить это действие?
    </DialogContentText>
  </DialogContent>
  <DialogActions sx={{ p: 2 }}>
    <Button 
      onClick={() => setOpenDialog(false)}
      variant="outlined"
      sx={{ borderRadius: 2, textTransform: 'none' }}
    >
      Отмена
    </Button>
    <Button 
      onClick={handleConfirm}
      variant="contained"
      color="primary"
      sx={{ borderRadius: 2, textTransform: 'none' }}
    >
      Подтвердить
    </Button>
  </DialogActions>
</Dialog>
```

## Структура страницы

Типовая структура страницы:

```jsx
const PageComponent = () => {
  // Хуки и состояния
  const { data, isLoading, error } = useData();
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  // Обработчики событий
  const handleAction = () => {
    // Логика обработки
  };
  
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Заголовок страницы */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Заголовок страницы
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Добавить
        </Button>
      </Box>
      
      {/* Состояние загрузки */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Обработка ошибок */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          Произошла ошибка при загрузке данных
        </Alert>
      )}
      
      {/* Основное содержимое */}
      {!isLoading && !error && data && (
        <Grid container spacing={3}>
          {/* Компоненты страницы */}
        </Grid>
      )}
      
      {/* Модальные окна и уведомления */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        {/* Содержимое диалога */}
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};
```

## Адаптивность

Рекомендации по адаптивности:

1. **Используйте систему сетки Material UI:**
```jsx
<Grid container spacing={3}>
  <Grid item xs={12} sm={6} md={4} lg={3}>
    {/* Содержимое блока */}
  </Grid>
</Grid>
```

2. **Адаптируйте отступы в зависимости от размера экрана:**
```jsx
<Box sx={{ 
  p: { xs: 2, sm: 3, md: 4 },
  mt: { xs: 2, sm: 3 }
}}>
  {/* Содержимое */}
</Box>
```

3. **Используйте flexbox для адаптивных компоновок:**
```jsx
<Box sx={{ 
  display: 'flex', 
  flexDirection: { xs: 'column', sm: 'row' },
  alignItems: { xs: 'stretch', sm: 'center' },
  gap: 2
}}>
  {/* Содержимое */}
</Box>
```

4. **Проверяйте размер экрана через useMediaQuery:**
```jsx
const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

return (
  <Box>
    {isMobile ? (
      <MobileView />
    ) : (
      <DesktopView />
    )}
  </Box>
);
```

## Тёмная тема

Приложение поддерживает светлую и тёмную темы:

```jsx
// Использование темы в компонентах
import { useThemeMode } from '../context/ThemeContext';

const Component = () => {
  const { darkMode, toggleTheme } = useThemeMode();
  
  return (
    <Box>
      <IconButton onClick={toggleTheme}>
        {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Box>
  );
};
```

## Шаблоны компонентов

### Шаблон страницы списка

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress,
  Grid, Card, CardContent, IconButton,
  TextField, InputAdornment
} from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { useEntities } from '../hooks/useEntities';

const EntitiesListPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { entities, isLoading, error } = useEntities();
  
  // Фильтрация по поисковому запросу
  const filteredEntities = entities.filter(entity => 
    entity.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Заголовок и кнопка добавления */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2,
        mb: 3
      }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Название страницы
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/entities/new')}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600
          }}
        >
          Добавить
        </Button>
      </Box>
      
      {/* Поиск */}
      <TextField
        fullWidth
        placeholder="Поиск..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ 
          mb: 3,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2
          }
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />
      
      {/* Индикатор загрузки */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Сообщение об ошибке */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          Ошибка загрузки данных
        </Alert>
      )}
      
      {/* Список сущностей */}
      {!isLoading && !error && (
        <Grid container spacing={2}>
          {filteredEntities.length > 0 ? (
            filteredEntities.map(entity => (
              <Grid item xs={12} sm={6} md={4} key={entity.id}>
                <Card 
                  sx={{ 
                    borderRadius: 3,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }
                  }}
                  onClick={() => navigate(`/entities/${entity.id}`)}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {entity.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {entity.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))
          ) : (
            <Grid item xs={12}>
              <Box sx={{ 
                p: 4, 
                textAlign: 'center', 
                bgcolor: 'background.paper',
                borderRadius: 3
              }}>
                <Typography color="text.secondary">
                  Не найдено записей
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default EntitiesListPage;
```

### Шаблон страницы деталей

```jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, CircularProgress,
  Paper, Divider, Chip, Grid, Alert,
  IconButton, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useEntity } from '../hooks/useEntities';

const EntityDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { entity, isLoading, error, deleteEntity } = useEntity(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  const handleDelete = async () => {
    try {
      await deleteEntity(id);
      navigate('/entities');
    } catch (error) {
      console.error('Error deleting entity:', error);
    }
    setConfirmDelete(false);
  };
  
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Заголовок с кнопкой "Назад" */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center',
        mb: 3
      }}>
        <IconButton 
          sx={{ mr: 1 }}
          onClick={() => navigate(-1)}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
          Детали записи
        </Typography>
        
        {!isLoading && entity && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/entities/${id}/edit`)}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none'
              }}
            >
              Изменить
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmDelete(true)}
              sx={{ 
                borderRadius: 2,
                textTransform: 'none'
              }}
            >
              Удалить
            </Button>
          </Box>
        )}
      </Box>
      
      {/* Индикатор загрузки */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Сообщение об ошибке */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          Ошибка загрузки данных
        </Alert>
      )}
      
      {/* Информация о записи */}
      {!isLoading && entity && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ 
            p: 3, 
            background: 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)',
            color: 'white'
          }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {entity.title}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {entity.subtitle}
            </Typography>
          </Box>
          
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="body1">
                  {entity.description}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Свойство 1
                </Typography>
                <Typography variant="body1">
                  {entity.property1}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Свойство 2
                </Typography>
                <Typography variant="body1">
                  {entity.property2}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}
      
      {/* Диалог подтверждения удаления */}
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить эту запись? Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setConfirmDelete(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleDelete}
            variant="contained"
            color="error"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EntityDetailsPage;