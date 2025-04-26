import { useEffect, useState, useCallback } from 'react';
import { 
  Typography, Grid, Paper, Box, CircularProgress,
  Card, CardContent, CardHeader, Divider, Alert,
  Button, IconButton, Avatar, List, ListItem, ListItemText,
  ListItemAvatar, Chip, LinearProgress, Tooltip, AlertTitle
} from '@mui/material';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DateRangeIcon from '@mui/icons-material/DateRange';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQueryClient } from '@tanstack/react-query';

const statusColors = {
  'new': '#ffa726',
  'in_progress': '#29b6f6',
  'closed': '#66bb6a'
};

const priorityColors = {
  'low': '#8bc34a',
  'medium': '#ffa726',
  'high': '#f44336'
};

// Функция для форматирования статуса
const formatStatus = (status) => {
  const statusMap = {
    'new': 'Новая',
    'in_progress': 'В работе',
    'closed': 'Закрыта'
  };
  return statusMap[status] || status;
};

// Функция для форматирования приоритета
const formatPriority = (priority) => {
  const priorityMap = {
    'low': 'Низкий',
    'medium': 'Средний',
    'high': 'Высокий'
  };
  return priorityMap[priority] || priority;
};

// Функция для получения иконки статуса
const getStatusIcon = (status) => {
  switch (status) {
    case 'new':
      return <ErrorIcon />;
    case 'in_progress':
      return <AccessTimeIcon />;
    case 'closed':
      return <CheckCircleIcon />;
    default:
      return <AssignmentIcon />;
  }
};

const DashboardPage = () => {
  const { tickets, isLoading: isTicketsLoading, isError: isTicketsError } = useTickets();
  const { user, refreshUserData } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  
  // Функция для обновления данных
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Обновляем данные пользователя
      await refreshUserData();
      // Обновляем данные заявок
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUserData, queryClient]);
  
  // Проверка, что пользователь существует и у него есть id
  if (!user) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Ошибка получения данных пользователя. Пожалуйста, перезайдите в систему.
      </Alert>
    );
  }
  
  // Работаем только с данными о заявках пользователя
  const isLoading = isTicketsLoading;
  const isError = isTicketsError;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Загрузка данных...</Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Ошибка загрузки данных заявок. Пожалуйста, попробуйте позже.
      </Alert>
    );
  }

  // Проверка, что tickets действительно массив
  if (!Array.isArray(tickets)) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Ошибка получения списка заявок. Формат данных некорректен.
      </Alert>
    );
  }

  console.log('Текущий пользователь:', user);
  console.log('Все заявки:', tickets);
  
  // Выводим первую заявку для анализа структуры
  if (tickets.length > 0) {
    console.log('Структура заявки:', JSON.stringify(tickets[0], null, 2));
  }
  
  // Получаем заявки, созданные текущим пользователем
  const userTickets = tickets.filter(ticket => {
    // Проверяем все возможные поля идентификации пользователя в заявке
    return (
      // Поле из API бэкенда
      ticket?.creator_id === user?.id ||
      
      // Другие возможные поля для совместимости
      ticket?.created_by_id === user?.id || 
      ticket?.requester_id === user?.id ||
      ticket?.user_id === user?.id ||
      
      // Проверка на email, если id не совпадают
      (ticket?.created_by?.email && user?.email && 
        ticket?.created_by?.email.toLowerCase() === user?.email.toLowerCase())
    );
  });
  
  console.log('Отфильтрованные заявки пользователя:', userTickets);
  
  // Фильтрация заявок пользователя по статусам
  const newTickets = userTickets.filter(ticket => 
    ticket?.status?.toLowerCase() === 'new' || 
    ticket?.status?.toLowerCase() === 'новая'
  );
  const inProgressTickets = userTickets.filter(ticket => 
    ticket?.status?.toLowerCase() === 'in_progress' || 
    ticket?.status?.toLowerCase() === 'в работе'
  );
  const closedTickets = userTickets.filter(ticket => 
    ticket?.status?.toLowerCase() === 'closed' || 
    ticket?.status?.toLowerCase() === 'закрыта'
  );

  // Создаем статистику на основе данных заявок пользователя
  const stats = {
    total: userTickets.length,
    by_status: {
      new: newTickets.length,
      in_progress: inProgressTickets.length,
      closed: closedTickets.length,
    },
    high_priority: userTickets.filter(ticket => ticket.priority === 'high').length
  };

  // Проверяем наличие необходимых полей в объекте статистики
  const safeStats = {
    total: stats.total || 0,
    by_status: {
      new: stats.by_status?.new || 0,
      in_progress: stats.by_status?.in_progress || 0,
      closed: stats.by_status?.closed || 0,
    },
    high_priority: stats.high_priority || 0
  };

  // Получаем активные заявки пользователя (не закрытые)
  const activeUserTickets = userTickets.filter(ticket => 
    ticket.status !== 'closed' && 
    ticket.status?.toLowerCase() !== 'закрыта'
  );
  
  // Заявки пользователя с высоким приоритетом
  const highPriorityUserTickets = activeUserTickets.filter(ticket => 
    ticket.priority === 'high'
  );

  // Рассчитываем процент прогресса
  const totalTicketsCount = safeStats.total || 1; // Избегаем деления на ноль
  const resolvedPercentage = Math.round((safeStats.by_status.closed / totalTicketsCount) * 100);

  // Проверка на отсутствие заявок для отображения предупреждения
  const hasNoTickets = Array.isArray(tickets) && tickets.length === 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Информационная панель
        </Typography>
        <Box>
          <Button 
            variant="outlined"
            color="primary"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ mr: 2 }}
          >
            {refreshing ? 'Обновление...' : 'Обновить'}
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            component={RouterLink} 
            to="/tickets/new"
          >
            Создать заявку
          </Button>
        </Box>
      </Box>

      {/* Уведомление об отсутствии заявок */}
      {hasNoTickets && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Нет заявок</AlertTitle>
          У вас пока нет созданных заявок. Вы можете создать новую заявку, нажав кнопку "Создать заявку".
        </Alert>
      )}

      {/* Приветствие пользователя */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)',
          color: 'white'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'white' }}>
              <PersonIcon color="primary" sx={{ fontSize: 40 }} />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5">
              Здравствуйте, {user?.name || 'пользователь'}!
            </Typography>
            <Typography variant="subtitle1">
              {activeUserTickets.length === 0 ? (
                'У вас нет активных заявок.'
              ) : (
                `У вас ${activeUserTickets.length} ${activeUserTickets.length === 1 ? 'активная заявка' : 
                activeUserTickets.length >= 2 && activeUserTickets.length <= 4 ? 'активные заявки' : 'активных заявок'}${
                  highPriorityUserTickets.length > 0 ? `, из них ${highPriorityUserTickets.length} с высоким приоритетом` : ''
                }.`
              )}
            </Typography>
          </Grid>
          <Grid item>
            <Chip 
              label={`Заявки: ${resolvedPercentage}% решено`} 
              color="default" 
              sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)', color: '#1976d2' }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Основные показатели */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h6">Всего заявок</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: '#673ab7', mr: 1 }} />
                <Typography variant="h3">{safeStats.total}</Typography>
              </Box>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              right: -20, 
              bottom: -20, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: 'rgba(103, 58, 183, 0.1)',
              zIndex: 1
            }} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h6" sx={{ color: statusColors.new }}>Новые заявки</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <ErrorIcon sx={{ fontSize: 40, color: statusColors.new, mr: 1 }} />
                <Typography variant="h3">{safeStats.by_status.new}</Typography>
              </Box>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              right: -20, 
              bottom: -20, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: `${statusColors.new}20`,
              zIndex: 1
            }} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h6" sx={{ color: statusColors.in_progress }}>В работе</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <AccessTimeIcon sx={{ fontSize: 40, color: statusColors.in_progress, mr: 1 }} />
                <Typography variant="h3">{safeStats.by_status.in_progress}</Typography>
              </Box>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              right: -20, 
              bottom: -20, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: `${statusColors.in_progress}20`,
              zIndex: 1
            }} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h6" sx={{ color: statusColors.closed }}>Закрытые заявки</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: statusColors.closed, mr: 1 }} />
                <Typography variant="h3">{safeStats.by_status.closed}</Typography>
              </Box>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              right: -20, 
              bottom: -20, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: `${statusColors.closed}20`,
              zIndex: 1
            }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Прогресс-бар по заявкам */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Общий прогресс заявок
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 100 }}>
                Выполнено:
              </Typography>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={resolvedPercentage}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: statusColors.closed
                    }
                  }} 
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: 45 }}>
                {resolvedPercentage}%
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 100 }}>
                В работе:
              </Typography>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(safeStats.by_status.in_progress / totalTicketsCount) * 100}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: statusColors.in_progress
                    }
                  }} 
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: 45 }}>
                {Math.round((safeStats.by_status.in_progress / totalTicketsCount) * 100)}%
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 100 }}>
                Новые:
              </Typography>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={(safeStats.by_status.new / totalTicketsCount) * 100}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: statusColors.new
                    }
                  }} 
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: 45 }}>
                {Math.round((safeStats.by_status.new / totalTicketsCount) * 100)}%
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Контейнеры нижнего уровня */}
      <Grid container spacing={3}>
        {/* Последние заявки */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader 
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AssignmentIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Последние заявки</Typography>
                </Box>
              } 
            />
            <Divider />
            <CardContent sx={{ pt: 0 }}>
              {userTickets.length > 0 ? (
                <List>
                  {userTickets.slice(0, 10).map((ticket) => (
                    <ListItem 
                      key={ticket.id} 
                      sx={{ 
                        mb: 1, 
                        bgcolor: '#f5f5f5', 
                        borderRadius: 1,
                        borderLeft: `4px solid ${priorityColors[ticket.priority] || '#777'}` 
                      }}
                      component={RouterLink}
                      to={`/tickets/${ticket.id}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: statusColors[ticket.status] || '#777' }}>
                          {getStatusIcon(ticket.status)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText 
                        primary={ticket.title}
                        secondary={
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={formatStatus(ticket.status)} 
                              size="small" 
                              sx={{ bgcolor: `${statusColors[ticket.status]}30`, color: statusColors[ticket.status] }}
                            />
                            <Chip 
                              label={formatPriority(ticket.priority)} 
                              size="small"
                              sx={{ bgcolor: `${priorityColors[ticket.priority]}30`, color: priorityColors[ticket.priority] }}
                            />
                            <Chip 
                              label={ticket.created_by?.name || 'Неизвестно'} 
                              size="small"
                              icon={<PersonIcon />}
                              variant="outlined"
                              color="default"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography sx={{ textAlign: 'center', py: 3 }} color="textSecondary">
                  Заявок нет.
                </Typography>
              )}
              {userTickets.length > 10 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    component={RouterLink} 
                    to="/tickets"
                  >
                    Показать все заявки ({userTickets.length})
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage; 