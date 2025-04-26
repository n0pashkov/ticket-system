import { useEffect, useState } from 'react';
import { 
  Typography, Grid, Paper, Box, CircularProgress,
  Card, CardContent, CardHeader, Divider, Alert,
  Button, IconButton, Avatar, List, ListItem, ListItemText,
  ListItemAvatar, Chip, LinearProgress, Tooltip, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination
} from '@mui/material';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { statisticsAPI, usersAPI } from '../api/api';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BarChartIcon from '@mui/icons-material/BarChart';
import CategoryIcon from '@mui/icons-material/Category';

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

// Функция для форматирования роли пользователя
const formatRole = (role) => {
  const roleMap = {
    'admin': 'Администратор',
    'agent': 'Тех. специалист',
    'user': 'Пользователь'
  };
  return roleMap[role] || role;
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

const AdminDashboardPage = () => {
  const { tickets, isLoading: isTicketsLoading, isError: isTicketsError } = useTickets();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Получаем статистику с сервера
  const { data: statsData, isLoading: isStatsLoading, isError: isStatsError } = useQuery({
    queryKey: ['statistics', 'tickets-summary'],
    queryFn: statisticsAPI.getTicketStats,
    select: (response) => response.data,
    onError: (error) => {
      console.error('Error fetching statistics:', error);
    },
    retry: false,
    useErrorBoundary: false
  });

  // Получаем производительность агентов
  const { data: agentPerformance, isLoading: isAgentPerformanceLoading, isError: isAgentPerformanceError } = useQuery({
    queryKey: ['statistics', 'agent-performance'],
    queryFn: () => statisticsAPI.getAgentPerformance(),
    select: (response) => response.data,
    onError: (error) => {
      console.error('Error fetching agent performance:', error);
    },
    retry: false,
    useErrorBoundary: false
  });

  // Получаем статистику активности пользователей
  const { data: userActivity, isLoading: isUserActivityLoading, isError: isUserActivityError } = useQuery({
    queryKey: ['statistics', 'user-activity'],
    queryFn: () => statisticsAPI.getUserActivity(),
    select: (response) => response.data,
    onError: (error) => {
      console.error('Error fetching user activity:', error);
    },
    retry: false,
    useErrorBoundary: false
  });

  // Получаем список всех пользователей
  const { data: usersData, isLoading: isUsersLoading, isError: isUsersError } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getAll,
    select: (response) => response.data,
    onError: (error) => {
      console.error('Error fetching users:', error);
    },
    retry: false,
    useErrorBoundary: false
  });

  const isLoading = isTicketsLoading || isStatsLoading || isAgentPerformanceLoading || isUserActivityLoading || isUsersLoading;
  const isError = isTicketsError || isStatsError || isAgentPerformanceError || isUserActivityError || isUsersError;

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
        Ошибка загрузки данных. Пожалуйста, попробуйте позже.
      </Alert>
    );
  }

  // Получаем данные статистики или используем запасные значения
  const stats = statsData || {
    total: tickets.length,
    by_status: {
      new: tickets.filter(t => t.status?.toLowerCase() === 'new' || t.status?.toLowerCase() === 'новая').length,
      in_progress: tickets.filter(t => t.status?.toLowerCase() === 'in_progress' || t.status?.toLowerCase() === 'в работе').length,
      closed: tickets.filter(t => t.status?.toLowerCase() === 'closed' || t.status?.toLowerCase() === 'закрыта').length,
    },
    by_priority: {
      low: tickets.filter(t => t.priority === 'low').length,
      medium: tickets.filter(t => t.priority === 'medium').length,
      high: tickets.filter(t => t.priority === 'high').length,
    }
  };

  // Убедимся, что структура объекта stats корректна
  const safeStats = {
    total: stats?.total || tickets.length || 0,
    by_status: {
      new: stats?.by_status?.new || tickets.filter(t => t.status?.toLowerCase() === 'new' || t.status?.toLowerCase() === 'новая').length || 0,
      in_progress: stats?.by_status?.in_progress || tickets.filter(t => t.status?.toLowerCase() === 'in_progress' || t.status?.toLowerCase() === 'в работе').length || 0,
      closed: stats?.by_status?.closed || tickets.filter(t => t.status?.toLowerCase() === 'closed' || t.status?.toLowerCase() === 'закрыта').length || 0,
    },
    by_priority: {
      low: stats?.by_priority?.low || tickets.filter(t => t.priority === 'low').length || 0,
      medium: stats?.by_priority?.medium || tickets.filter(t => t.priority === 'medium').length || 0,
      high: stats?.by_priority?.high || tickets.filter(t => t.priority === 'high').length || 0,
    }
  };

  // Фильтрация заявок по статусам для отображения
  const newTickets = tickets.filter(ticket => 
    ticket.status?.toLowerCase() === 'new' || ticket.status?.toLowerCase() === 'новая'
  );
  const inProgressTickets = tickets.filter(ticket => 
    ticket.status?.toLowerCase() === 'in_progress' || ticket.status?.toLowerCase() === 'в работе'
  );
  const closedTickets = tickets.filter(ticket => 
    ticket.status?.toLowerCase() === 'closed' || ticket.status?.toLowerCase() === 'закрыта'
  );

  // Заявки с высоким приоритетом
  const highPriorityTickets = tickets.filter(ticket => ticket.priority === 'high');

  // Рассчитываем процент прогресса
  const totalTicketsCount = safeStats.total || 1; // Избегаем деления на ноль
  const resolvedPercentage = Math.round((safeStats.by_status.closed / totalTicketsCount) * 100);

  // Получаем данные о пользователях
  const users = usersData || [];
  const agentsCount = users.filter(user => user.role === 'agent').length;
  const adminCount = users.filter(user => user.role === 'admin').length;
  const regularUsersCount = users.filter(user => user.role === 'user').length;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Панель администратора
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          component={RouterLink} 
          to="/category-management"
        >
          Управление категориями
        </Button>
      </Box>

      {/* Приветствие администратора */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(120deg, #f44336 0%, #ff9800 100%)',
          color: 'white'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Avatar sx={{ width: 64, height: 64, bgcolor: 'white' }}>
              <SupervisorAccountIcon color="error" sx={{ fontSize: 40 }} />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5">
              Здравствуйте, {user?.name || 'администратор'}!
            </Typography>
            <Typography variant="subtitle1">
              {tickets.length === 0 ? (
                'В системе пока нет заявок.'
              ) : (
                `В системе ${tickets.length} ${
                  tickets.length === 1 ? 'заявка' : 
                  tickets.length >= 2 && tickets.length <= 4 ? 'заявки' : 'заявок'
                }${
                  highPriorityTickets.length > 0 ? `, из них ${highPriorityTickets.length} с высоким приоритетом` : ''
                }.`
              )}
            </Typography>
          </Grid>
          <Grid item>
            <Chip 
              label={`Выполнено: ${resolvedPercentage}%`} 
              color="default" 
              sx={{ fontWeight: 'bold', bgcolor: 'rgba(255,255,255,0.9)', color: '#d32f2f' }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {/* Основные показатели заявок */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h6">Всего заявок</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: '#673ab7', mr: 1 }} />
                <Typography variant="h3">{tickets.length}</Typography>
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
              <Typography variant="h6" sx={{ color: statusColors.new }}>Новые</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <ErrorIcon sx={{ fontSize: 40, color: statusColors.new, mr: 1 }} />
                <Typography variant="h3">{newTickets.length}</Typography>
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
              <Typography variant="h6" sx={{ color: statusColors.closed }}>Закрыто</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: statusColors.closed, mr: 1 }} />
                <Typography variant="h3">{closedTickets.length}</Typography>
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

      {/* Статистика по пользователям */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h6">Пользователи</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <PersonIcon sx={{ fontSize: 40, color: '#4caf50', mr: 1 }} />
                <Typography variant="h3">{regularUsersCount}</Typography>
              </Box>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              right: -20, 
              bottom: -20, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: 'rgba(76, 175, 80, 0.1)',
              zIndex: 1
            }} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h6">Тех. специалисты</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <EngineeringIcon sx={{ fontSize: 40, color: '#2196f3', mr: 1 }} />
                <Typography variant="h3">{agentsCount}</Typography>
              </Box>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              right: -20, 
              bottom: -20, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              zIndex: 1
            }} />
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={3} sx={{ p: 2, height: '100%', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'relative', zIndex: 2 }}>
              <Typography variant="h6">Администраторы</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <SupervisorAccountIcon sx={{ fontSize: 40, color: '#f44336', mr: 1 }} />
                <Typography variant="h3">{adminCount}</Typography>
              </Box>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              right: -20, 
              bottom: -20, 
              width: 100, 
              height: 100, 
              borderRadius: '50%', 
              bgcolor: 'rgba(244, 67, 54, 0.1)',
              zIndex: 1
            }} />
          </Paper>
        </Grid>
      </Grid>

      {/* Прогресс заявок */}
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

      {/* Производительность агентов */}
      {agentPerformance && agentPerformance.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardHeader 
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <BarChartIcon sx={{ mr: 1 }} />
                    <Typography variant="h6">Производительность технических специалистов</Typography>
                  </Box>
                } 
              />
              <Divider />
              <CardContent>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Специалист</TableCell>
                        <TableCell align="right">Назначено</TableCell>
                        <TableCell align="right">Решено</TableCell>
                        <TableCell align="right">% решения</TableCell>
                        <TableCell align="right">Среднее время (ч)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {agentPerformance.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((agent) => (
                        <TableRow key={agent.agent_id}>
                          <TableCell>{agent.agent_name}</TableCell>
                          <TableCell align="right">{agent.assigned_tickets}</TableCell>
                          <TableCell align="right">{agent.resolved_tickets}</TableCell>
                          <TableCell align="right">
                            {(agent.resolution_rate * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">
                            {agent.avg_resolution_time_hours ? Math.round(agent.avg_resolution_time_hours) : 'Н/Д'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={agentPerformance.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  labelRowsPerPage="Строк на странице:"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Последние заявки */}
      <Grid container spacing={3}>
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
              {tickets.length > 0 ? (
                <List>
                  {tickets.slice(0, 10).map((ticket) => (
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
                            {ticket.assigned_to && (
                              <Chip 
                                label={`Исп: ${ticket.assigned_to.name || 'Неизвестно'}`} 
                                size="small"
                                icon={<EngineeringIcon />}
                                variant="outlined"
                                color="primary"
                              />
                            )}
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
              {tickets.length > 10 && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    component={RouterLink} 
                    to="/tickets"
                  >
                    Показать все заявки ({tickets.length})
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

export default AdminDashboardPage; 