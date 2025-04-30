import { useEffect, useState } from 'react';
import { 
  Typography, Grid, Box, CircularProgress,
  Card, CardContent, CardHeader, Divider, Alert, AlertTitle,
  Button, IconButton, Avatar, Chip, LinearProgress, Skeleton
} from '@mui/material';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';
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
                label={ticket.created_by.name || 'Неизвестно'} 
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
          </Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const AgentDashboardPage = () => {
  const { tickets, isLoading: isTicketsLoading, isError: isTicketsError } = useTickets();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  
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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
    }
  };
  
  // Обработчик перехода к заявке
  const handleTicketClick = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
  };

  if (isTicketsLoading) {
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

  if (isTicketsError) {
    return (
      <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
        <AlertTitle>Ошибка загрузки</AlertTitle>
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
  
  // Заявки без назначенного исполнителя
  const ticketsToTake = tickets.filter(ticket => 
    !ticket.assigned_to_id
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
    <Box sx={{ width: '100%', p: 0, boxSizing: 'border-box' }}>
      {/* Заголовок и кнопки управления */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3
      }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Панель технического специалиста
        </Typography>
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
      </Box>

      {/* Приветствие агента */}
      <Card 
        sx={{ 
          mb: 3, 
          borderRadius: 4, 
          background: 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)',
          color: 'white',
          boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
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
                color: '#2196f3',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}
            >
              <EngineeringIcon fontSize="large" />
            </Avatar>
            <Box sx={{ ml: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Здравствуйте, {user?.name || 'специалист'}!
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.95rem' }}>
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
            </Box>
            <Box sx={{ ml: 'auto' }}>
              <Chip 
                label={`Решено: ${Math.round(resolutionRate * 100)}%`} 
                color="default" 
                sx={{ 
                  fontWeight: 'bold', 
                  bgcolor: 'rgba(255,255,255,0.9)', 
                  color: '#1976d2',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      {/* Основные показатели */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, fontSize: '1.05rem' }}>
          Статистика заявок
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard 
              icon={<AssignmentIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={assignedTickets.length} 
              label="Активные заявки" 
              color="#673ab7"
              onClick={() => navigate('/tickets?assigned=me')}
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard 
              icon={<ErrorIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={ticketsToTake.length} 
              label="К выполнению" 
              color={statusColors.new}
              onClick={() => navigate('/tickets?status=new&unassigned=true')}
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard 
              icon={<AccessTimeIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={inProgressTickets.length} 
              label="В работе" 
              color={statusColors.in_progress}
              onClick={() => navigate('/tickets?status=in_progress&assigned=me')}
            />
          </Grid>
          <Grid item xs={6} sm={6} md={3}>
            <StatCard 
              icon={<CheckCircleIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={recentlyClosedTickets.length} 
              label="Решено" 
              color={statusColors.closed}
              onClick={() => navigate('/tickets?status=closed&assigned=me')}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Прогресс работы */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ mr: 1, color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Ваша работа
              </Typography>
            </Box>
          }
        />
        <Divider />
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Процент решения заявок: <strong>{(resolutionRate * 100).toFixed(1)}%</strong>
            </Typography>
          </Box>
          <Box sx={{ width: '100%', mb: 2 }}>
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Вы решили {recentlyClosedTickets.length} из {totalAssignedCount} назначенных вам заявок.
          </Typography>
        </CardContent>
      </Card>

      {/* Список доступных заявок для взятия в работу */}
      {ticketsToTake.length > 0 && (
        <Card elevation={0} sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ErrorIcon sx={{ mr: 1, color: statusColors.new }} />
                <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                  Доступные для взятия в работу
                </Typography>
              </Box>
            }
            action={
              <Button 
                component={RouterLink} 
                to="/tickets?status=new&unassigned=true"
                sx={{ 
                  textTransform: 'none', 
                  fontWeight: 500, 
                  color: '#1976d2' 
                }}
              >
                Все новые
              </Button>
            }
          />
          <Divider />
          <CardContent sx={{ p: 2 }}>
            {ticketsToTake.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {ticketsToTake
                  .sort((a, b) => {
                    // Сортировка по приоритету (высокий -> средний -> низкий)
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                  })
                  .slice(0, 5)
                  .map((ticket) => (
                    <TicketCard 
                      key={ticket.id}
                      ticket={ticket}
                      onClick={() => handleTicketClick(ticket.id)}
                    />
                  ))}
              </Box>
            ) : (
              <Typography sx={{ textAlign: 'center', py: 3 }} color="textSecondary">
                Нет новых заявок, требующих назначения.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Список назначенных заявок */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <CardHeader 
          title={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <AssignmentIcon sx={{ mr: 1, color: '#1976d2' }} />
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
                Ваши активные заявки
              </Typography>
            </Box>
          }
          action={
            <Button 
              component={RouterLink} 
              to="/tickets?assigned=me"
              sx={{ 
                textTransform: 'none', 
                fontWeight: 500, 
                color: '#1976d2' 
              }}
            >
              Все заявки
            </Button>
          }
        />
        <Divider />
        <CardContent sx={{ p: 2 }}>
          {assignedTickets.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {assignedTickets
                .sort((a, b) => {
                  // Сортировка по приоритету (высокий -> средний -> низкий)
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .slice(0, 5)
                .map((ticket) => (
                  <TicketCard 
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => handleTicketClick(ticket.id)}
                  />
                ))}
            </Box>
          ) : (
            <Typography sx={{ textAlign: 'center', py: 3 }} color="textSecondary">
              У вас нет активных заявок в работе.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AgentDashboardPage; 