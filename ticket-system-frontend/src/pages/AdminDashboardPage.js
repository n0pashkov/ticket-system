import { useState } from 'react';
import { 
  Typography, Grid, Box, CircularProgress,
  Card, CardContent, CardHeader, Divider, Alert, AlertTitle,
  Button, IconButton, Avatar, Chip, LinearProgress, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Skeleton
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
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BarChartIcon from '@mui/icons-material/BarChart';
import RefreshIcon from '@mui/icons-material/Refresh';

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

// Компонент статистической карточки
const StatCard = ({ icon, count, label, color, onClick }) => (
  <Card 
    sx={{ 
      borderRadius: 3, 
      overflow: 'hidden', 
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      position: 'relative',
      height: '100%',
      cursor: onClick ? 'pointer' : 'default'
    }}
    onClick={onClick}
  >
    <Box 
      sx={{ 
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        background: `linear-gradient(145deg, ${color}15 0%, ${color}25 100%)`,
        height: '100%'
      }}
    >
      <Avatar
        sx={{ 
          bgcolor: color,
          width: 40, 
          height: 40,
          boxShadow: `0 4px 8px ${color}50`,
        }}
      >
        {icon}
      </Avatar>
      <Box sx={{ ml: 1.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, fontSize: '1.3rem', lineHeight: 1.2 }}>
          {count}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  </Card>
);

// Компонент карточки заявки
const TicketCard = ({ ticket, onClick }) => (
  <Card 
    sx={{ 
      mb: 2, 
      borderRadius: 3, 
      overflow: 'hidden',
      border: `1px solid #f0f0f0`,
      position: 'relative',
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
      <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
        <Avatar 
          sx={{ 
            bgcolor: statusColors[ticket.status] || '#ccc',
            width: 40, 
            height: 40,
            mr: 1.5,
            flexShrink: 0
          }}
        >
          {ticket.status === 'new' && <ErrorIcon />}
          {ticket.status === 'in_progress' && <AccessTimeIcon />}
          {ticket.status === 'closed' && <CheckCircleIcon />}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 600, 
              mb: 1,
              lineHeight: 1.3,
              fontSize: '1rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word',
              width: '100%'
            }}
          >
            {ticket.title}
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
            <Chip 
              label={formatStatus(ticket.status)} 
              size="small" 
              sx={{ 
                bgcolor: `${statusColors[ticket.status]}15`, 
                color: statusColors[ticket.status],
                fontWeight: 500,
                fontSize: '0.75rem',
                maxWidth: '100%'
              }}
            />
            <Chip 
              label={formatPriority(ticket.priority)} 
              size="small"
              sx={{ 
                bgcolor: `${priorityColors[ticket.priority]}15`, 
                color: priorityColors[ticket.priority],
                fontWeight: 500,
                fontSize: '0.75rem',
                maxWidth: '100%'
              }}
            />
            
            {ticket.created_by && (
              <Chip 
                label={ticket.created_by.name} 
                size="small"
                icon={<PersonIcon sx={{ fontSize: '0.8rem' }} />}
                variant="outlined"
                sx={{ 
                  maxWidth: '120px',
                  '.MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }
                }}
              />
            )}
            
            {ticket.assigned_to && (
              <Chip 
                label={ticket.assigned_to.name} 
                size="small"
                icon={<EngineeringIcon sx={{ fontSize: '0.8rem' }} />}
                variant="outlined"
                color="primary"
                sx={{ 
                  maxWidth: '120px',
                  '.MuiChip-label': {
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }
                }}
              />
            )}
          </Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const AdminDashboardPage = () => {
  const { tickets, isLoading: isTicketsLoading, isError: isTicketsError } = useTickets();
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  // Получаем статистику с сервера
  const { data: statsData, isLoading: isStatsLoading, isError: isStatsError } = useQuery({
    queryKey: ['statistics', 'tickets-summary'],
    queryFn: statisticsAPI.getTicketStats,
    select: (response) => response.data,
    // Добавляем настройки кэширования для статистики согласно серверной конфигурации
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
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
    // Добавляем настройки кэширования для данных производительности агентов
    staleTime: 5 * 60 * 1000, // 5 минут
    cacheTime: 10 * 60 * 1000, // 10 минут
    onError: (error) => {
      console.error('Error fetching agent performance:', error);
    },
    retry: false,
    useErrorBoundary: false
  });

  // Получаем список всех пользователей
  const { data: usersData, isLoading: isUsersLoading, isError: isUsersError } = useQuery({
    queryKey: ['users'],
    queryFn: usersAPI.getAll,
    select: (response) => response.data,
    // Добавляем настройки кэширования для пользовательских данных
    staleTime: 15 * 60 * 1000, // 15 минут
    cacheTime: 30 * 60 * 1000, // 30 минут
    onError: (error) => {
      console.error('Error fetching users:', error);
    },
    retry: false,
    useErrorBoundary: false
  });

  const isLoading = isTicketsLoading || isStatsLoading || isAgentPerformanceLoading || isUsersLoading;
  const isError = isTicketsError || isStatsError || isAgentPerformanceError || isUsersError;

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    // Здесь можно добавить логику обновления данных
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 4, mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="rectangular" height={100} width="25%" sx={{ borderRadius: 4 }} />
          <Skeleton variant="rectangular" height={100} width="25%" sx={{ borderRadius: 4 }} />
          <Skeleton variant="rectangular" height={100} width="25%" sx={{ borderRadius: 4 }} />
          <Skeleton variant="rectangular" height={100} width="25%" sx={{ borderRadius: 4 }} />
        </Box>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4, mb: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
        <AlertTitle>Ошибка загрузки</AlertTitle>
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
    <Box sx={{ width: '100%', p: 0, boxSizing: 'border-box' }}>
      {/* Заголовок и кнопки управления */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3
      }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Панель администратора
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton 
            color="primary"
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ 
              backgroundColor: 'rgba(25, 118, 210, 0.08)', 
              width: 42, 
              height: 42 
            }}
          >
            {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          </IconButton>
          
          <Button 
            variant="contained" 
            color="primary" 
            component={RouterLink} 
            to="/category-management"
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 10px rgba(25, 118, 210, 0.2)',
              textTransform: 'none'
            }}
          >
            Управление категориями
          </Button>
        </Box>
      </Box>

      {/* Приветствие администратора */}
      <Card 
        sx={{ 
          mb: 3, 
          borderRadius: 4, 
          background: 'linear-gradient(120deg, #f44336 0%, #ff9800 100%)',
          color: 'white',
          boxShadow: '0 4px 20px rgba(244, 67, 54, 0.3)',
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar 
              sx={{ 
                width: 56, 
                height: 56, 
                bgcolor: 'white', 
                color: '#f44336',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}
            >
              <SupervisorAccountIcon fontSize="large" />
            </Avatar>
            <Box sx={{ ml: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Здравствуйте, {user?.name || 'администратор'}!
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.95rem' }}>
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
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <Chip 
                label={`Выполнено: ${resolvedPercentage}%`} 
                color="default" 
                sx={{ 
                  fontWeight: 'bold', 
                  bgcolor: 'rgba(255,255,255,0.9)', 
                  color: '#d32f2f',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      {/* Основные показатели заявок */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, fontSize: '1.05rem' }}>
          Статистика заявок
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard 
              icon={<AssignmentIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={tickets.length} 
              label="Всего заявок" 
              color="#673ab7"
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard 
              icon={<ErrorIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={newTickets.length} 
              label="Новые" 
              color={statusColors.new}
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard 
              icon={<AccessTimeIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={inProgressTickets.length} 
              label="В работе" 
              color={statusColors.in_progress}
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard 
              icon={<CheckCircleIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={closedTickets.length} 
              label="Закрыты" 
              color={statusColors.closed}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Статистика по пользователям */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, fontSize: '1.05rem' }}>
          Пользователи в системе
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <StatCard 
              icon={<PersonIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={regularUsersCount} 
              label="Пользователи" 
              color="#4caf50"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard 
              icon={<EngineeringIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={agentsCount} 
              label="Тех. специалисты" 
              color="#2196f3"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <StatCard 
              icon={<SupervisorAccountIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={adminCount} 
              label="Администраторы" 
              color="#f44336"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Прогресс заявок */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ mr: 1, color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Общий прогресс заявок
              </Typography>
            </Box>
          }
        />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 100, fontSize: '0.9rem' }}>
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
            <Typography variant="body2" sx={{ minWidth: 45, fontWeight: 'bold' }}>
              {resolvedPercentage}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" sx={{ minWidth: 100, fontSize: '0.9rem' }}>
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
            <Typography variant="body2" sx={{ minWidth: 45, fontWeight: 'bold' }}>
              {Math.round((safeStats.by_status.in_progress / totalTicketsCount) * 100)}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ minWidth: 100, fontSize: '0.9rem' }}>
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
            <Typography variant="body2" sx={{ minWidth: 45, fontWeight: 'bold' }}>
              {Math.round((safeStats.by_status.new / totalTicketsCount) * 100)}%
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Производительность агентов */}
      {agentPerformance && agentPerformance.length > 0 && (
        <Card elevation={0} sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BarChartIcon sx={{ mr: 1, color: '#1976d2' }} />
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  Производительность технических специалистов
                </Typography>
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
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 28, height: 28, mr: 1, bgcolor: '#2196f3' }}>
                            <EngineeringIcon sx={{ fontSize: '1rem' }} />
                          </Avatar>
                          {agent.agent_name}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{agent.assigned_tickets}</TableCell>
                      <TableCell align="right">{agent.resolved_tickets}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(agent.resolution_rate * 100).toFixed(1)}%`}
                          size="small"
                          sx={{ 
                            bgcolor: 
                              agent.resolution_rate >= 0.8 ? `${statusColors.closed}20` : 
                              agent.resolution_rate >= 0.5 ? `${statusColors.in_progress}20` : 
                              `${statusColors.new}20`,
                            color: 
                              agent.resolution_rate >= 0.8 ? statusColors.closed : 
                              agent.resolution_rate >= 0.5 ? statusColors.in_progress : 
                              statusColors.new,
                          }}
                        />
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
      )}

      {/* Последние заявки */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AssignmentIcon sx={{ mr: 1, color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Последние заявки
              </Typography>
            </Box>
          } 
          action={
            tickets.length > 10 && (
              <Button 
                component={RouterLink} 
                to="/tickets"
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 500, 
                  color: '#1976d2' 
                }}
              >
                Все заявки
              </Button>
            )
          }
        />
        <Divider />
        <CardContent sx={{ p: 2 }}>
          {tickets.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {tickets.slice(0, 10).map((ticket) => (
                <TicketCard 
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => window.location.href = `/tickets/${ticket.id}`}
                />
              ))}
            </Box>
          ) : (
            <Typography sx={{ textAlign: 'center', py: 3 }} color="textSecondary">
              Заявок нет.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminDashboardPage; 