import { useEffect, useState } from 'react';
import { 
  Typography, Grid, Paper, Box, CircularProgress,
  Card, CardContent, CardHeader, Divider, Alert,
  Button, IconButton, Avatar, List, ListItem, ListItemText,
  ListItemAvatar, Chip, LinearProgress, Tooltip
} from '@mui/material';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';

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

const AgentDashboardPage = () => {
  const { tickets, isLoading: isTicketsLoading, isError: isTicketsError } = useTickets();
  const { user } = useAuth();
  
  // Отладочный код - выводим информацию о заявках в консоль
  useEffect(() => {
    if (tickets.length > 0) {
      console.log('Все заявки:', tickets);
      console.log('ID текущего агента:', user?.id);
      console.log('Заявки по статусам:', 
        tickets.reduce((acc, ticket) => {
          acc[ticket.status] = (acc[ticket.status] || 0) + 1;
          return acc;
        }, {})
      );
      console.log('Назначенные агенту заявки:', tickets.filter(ticket => ticket.assigned_to_id === user?.id));
    }
  }, [tickets, user]);

  if (isTicketsLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Загрузка данных...</Typography>
      </Box>
    );
  }

  if (isTicketsError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Ошибка загрузки данных. Пожалуйста, попробуйте позже.
      </Alert>
    );
  }

  // Фильтрация заявок, назначенных агенту
  const allAssignedTickets = tickets.filter(ticket => ticket.assigned_to_id === user?.id);
  
  // Только активные (незакрытые) заявки, назначенные агенту
  const assignedTickets = allAssignedTickets.filter(ticket => 
    !(ticket.status?.toLowerCase() === 'closed' || ticket.status?.toLowerCase() === 'закрыта')
  );
  
  // Заявки к выполнению - все новые заявки без назначенного исполнителя
  const ticketsToTake = tickets.filter(ticket => 
    (ticket.status?.toLowerCase() === 'new' || ticket.status?.toLowerCase() === 'новая') && 
    !ticket.assigned_to_id
  );
  
  // Заявки в статусе "Новая", назначенные агенту
  const newAssignedTickets = assignedTickets.filter(ticket => 
    ticket.status?.toLowerCase() === 'new' || 
    ticket.status?.toLowerCase() === 'новая'
  );
  const inProgressTickets = assignedTickets.filter(ticket => 
    ticket.status?.toLowerCase() === 'in_progress' || 
    ticket.status?.toLowerCase() === 'в работе'
  );
  const recentlyClosedTickets = allAssignedTickets.filter(ticket => 
    ticket.status?.toLowerCase() === 'closed' || 
    ticket.status?.toLowerCase() === 'закрыта'
  );

  // Заявки с высоким приоритетом
  const highPriorityTickets = assignedTickets.filter(ticket => ticket.priority === 'high');

  // Расчет процента решенных заявок
  const totalAssignedCount = allAssignedTickets.length || 1; // Избегаем деления на ноль
  const resolutionRate = recentlyClosedTickets.length / totalAssignedCount;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Панель технического специалиста
        </Typography>
      </Box>

      {/* Приветствие агента */}
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
              <EngineeringIcon color="primary" sx={{ fontSize: 40 }} />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5">
              Здравствуйте, {user?.name || 'специалист'}!
            </Typography>
            <Typography variant="subtitle1">
              {assignedTickets.length === 0 ? (
                'У вас нет активных заявок.'
              ) : (
                `У вас ${assignedTickets.length} ${
                  assignedTickets.length === 1 ? 'активная заявка' : 
                  assignedTickets.length >= 2 && assignedTickets.length <= 4 ? 'активные заявки' : 'активных заявок'
                }${
                  highPriorityTickets.length > 0 ? `, из них ${highPriorityTickets.length} с высоким приоритетом` : ''
                }.`
              )}
            </Typography>
          </Grid>
          <Grid item>
            <Chip 
              label={`Решено: ${Math.round(resolutionRate * 100)}%`} 
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
              <Typography variant="h6">Активные заявки</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: '#673ab7', mr: 1 }} />
                <Typography variant="h3">{assignedTickets.length}</Typography>
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
              <Typography variant="h6" sx={{ color: statusColors.new }}>К выполнению</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <ErrorIcon sx={{ fontSize: 40, color: statusColors.new, mr: 1 }} />
                <Typography variant="h3">{ticketsToTake.length}</Typography>
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
                <Typography variant="h3">{inProgressTickets.length}</Typography>
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
              <Typography variant="h6" sx={{ color: statusColors.closed }}>Решено</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: statusColors.closed, mr: 1 }} />
                <Typography variant="h3">{recentlyClosedTickets.length}</Typography>
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

      {/* Прогресс работы */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ваша работа
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ fontSize: 24, color: '#1976d2', mr: 1 }} />
                  <Typography variant="body1">
                    Процент решения заявок: <strong>{(resolutionRate * 100).toFixed(1)}%</strong>
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', mb: 3 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={resolutionRate * 100}
                    sx={{ 
                      height: 10, 
                      borderRadius: 5,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#1976d2'
                      }
                    }} 
                  />
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* Список доступных заявок для взятия в работу */}
      {ticketsToTake.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader 
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ErrorIcon sx={{ mr: 1, color: statusColors.new }} />
                    <Typography variant="h6">Доступные для взятия в работу</Typography>
                  </Box>
                }
              />
              <Divider />
              <CardContent sx={{ pt: 0 }}>
                <List>
                  {ticketsToTake
                    .sort((a, b) => {
                      // Сортировка по приоритету (высокий -> средний -> низкий)
                      const priorityOrder = { high: 0, medium: 1, low: 2 };
                      return priorityOrder[a.priority] - priorityOrder[b.priority];
                    })
                    .map((ticket) => (
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
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Список назначенных заявок */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardHeader 
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AssignmentIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">Ваши активные заявки</Typography>
                </Box>
              }
            />
            <Divider />
            <CardContent sx={{ pt: 0 }}>
              {assignedTickets.length > 0 ? (
                <List>
                  {assignedTickets
                    .sort((a, b) => {
                      // Сортировка по приоритету (высокий -> средний -> низкий)
                      const priorityOrder = { high: 0, medium: 1, low: 2 };
                      return priorityOrder[a.priority] - priorityOrder[b.priority];
                    })
                    .map((ticket) => (
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
                  У вас нет активных заявок в работе.
                </Typography>
              )}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  component={RouterLink} 
                  to="/tickets"
                >
                  Все заявки
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AgentDashboardPage; 