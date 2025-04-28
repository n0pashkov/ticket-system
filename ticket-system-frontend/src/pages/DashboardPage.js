import { useEffect, useState, useCallback } from 'react';
import { 
  Typography, Box, CircularProgress, Alert, AlertTitle,
  Button, Avatar, Chip, IconButton, SwipeableDrawer,
  Card, CardContent, Divider, Badge, List, ListItem,
  ListItemText, ListItemAvatar, Skeleton, Fab
} from '@mui/material';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// Иконки
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CloseIcon from '@mui/icons-material/Close';

// Константы для цветов
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

// Функции форматирования
const formatStatus = (status) => {
  const statusMap = {
    'new': 'Новая',
    'in_progress': 'В работе',
    'closed': 'Закрыта'
  };
  return statusMap[status] || status;
};

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
      width: '100%'
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
          </Box>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { tickets, isLoading: isTicketsLoading, isError: isTicketsError } = useTickets();
  const { user, refreshUserData } = useAuth();
  const queryClient = useQueryClient();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  // Обработчик обновления данных
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshUserData();
      await queryClient.invalidateQueries({ queryKey: ['tickets'] });
    } catch (error) {
      console.error('Ошибка при обновлении данных:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUserData, queryClient]);
  
  // Обработчик перехода к заявке
  const handleTicketClick = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
  };

  // Обработчик создания новой заявки
  const handleCreateTicket = () => {
    navigate('/tickets/new');
  };
  
  // Если пользователь не загружен
  if (!user) {
    return (
      <Alert severity="error" sx={{ m: 2, borderRadius: 3 }}>
        <AlertTitle>Ошибка аутентификации</AlertTitle>
        Не удалось получить данные пользователя. Пожалуйста, войдите снова.
      </Alert>
    );
  }
  
  // Отображение загрузки
  if (isTicketsLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 4, mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="rectangular" height={100} width="50%" sx={{ borderRadius: 4 }} />
          <Skeleton variant="rectangular" height={100} width="50%" sx={{ borderRadius: 4 }} />
        </Box>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 4 }} />
      </Box>
    );
  }

  // Ошибка загрузки заявок
  if (isTicketsError) {
    return (
      <Alert severity="error" sx={{ m: 2, borderRadius: 3 }}>
        <AlertTitle>Ошибка загрузки</AlertTitle>
        Не удалось загрузить данные заявок. Пожалуйста, проверьте подключение и попробуйте позже.
      </Alert>
    );
  }

  // Убедимся, что tickets это массив
  const safeTickets = Array.isArray(tickets) ? tickets : [];
  
  // Фильтруем заявки текущего пользователя
  const userTickets = safeTickets.filter(ticket => {
    return (
      ticket?.creator_id === user?.id ||
      ticket?.created_by_id === user?.id || 
      ticket?.requester_id === user?.id ||
      ticket?.user_id === user?.id ||
      (ticket?.created_by?.email && user?.email && 
        ticket?.created_by?.email.toLowerCase() === user?.email.toLowerCase())
    );
  });
  
  // Заявки по статусам
  const newTickets = userTickets.filter(t => t.status === 'new');
  const inProgressTickets = userTickets.filter(t => t.status === 'in_progress');
  const closedTickets = userTickets.filter(t => t.status === 'closed');
  
  // Высокоприоритетные заявки
  const highPriorityTickets = userTickets.filter(t => t.priority === 'high');

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100vw', 
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box'
    }}>
      <Box sx={{ 
        p: 2, 
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box', 
        overflowX: 'hidden'
      }}>
        {/* Заголовок и кнопка обновления */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          width: '100%'
        }}>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Мои заявки
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

      {/* Приветствие пользователя */}
        <Card 
        sx={{ 
            mb: 3, 
            borderRadius: 4, 
          background: 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)',
          color: 'white',
            boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
            width: '100%'
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
                <PersonIcon fontSize="large" />
              </Avatar>
              <Box sx={{ ml: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                  {user?.name || 'Пользователь'}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.95rem' }}>
                  {userTickets.length > 0 
                    ? `У вас ${userTickets.length} заяв${userTickets.length === 1 ? 'ка' : 
                       userTickets.length < 5 ? 'ки' : 'ок'}`
                    : 'У вас пока нет заявок'}
                  {highPriorityTickets.length > 0 && 
                    `, ${highPriorityTickets.length} требу${highPriorityTickets.length === 1 ? 'ет' : 'ют'} внимания`}
                </Typography>
              </Box>
                </Box>
          </CardContent>
        </Card>
        
        {/* Основная статистика */}
        <Box sx={{ mb: 3, width: '100%' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, fontSize: '1.05rem' }}>
            Статистика заявок
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: 2,
            width: '100%'
          }}>
            <StatCard 
              icon={<AssignmentIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={userTickets.length} 
              label="Всего" 
              color="#7e57c2"
              onClick={() => navigate('/tickets')}
            />
            <StatCard 
              icon={<ErrorIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={newTickets.length} 
              label="Новые" 
              color={statusColors.new}
              onClick={() => navigate('/tickets?status=new')}
            />
            <StatCard 
              icon={<AccessTimeIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={inProgressTickets.length} 
              label="В работе" 
              color={statusColors.in_progress}
              onClick={() => navigate('/tickets?status=in_progress')}
            />
            <StatCard 
              icon={<CheckCircleIcon sx={{ color: 'white', fontSize: '1.3rem' }} />} 
              count={closedTickets.length} 
              label="Закрыты" 
              color={statusColors.closed}
              onClick={() => navigate('/tickets?status=closed')}
            />
          </Box>
            </Box>
        
        {/* Последние заявки */}
        <Box sx={{ mb: 3, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
              Последние заявки
            </Typography>
            {userTickets.length > 3 && (
              <Button 
                size="small" 
                component={RouterLink} 
                to="/tickets"
                sx={{ fontWeight: 500, fontSize: '0.85rem' }}
              >
                ВСЕ ЗАЯВКИ
              </Button>
            )}
          </Box>
          
          {userTickets.length === 0 ? (
            <Alert 
              severity="info" 
              variant="outlined"
              sx={{ borderRadius: 3, width: '100%' }}
            >
              У вас пока нет заявок. Создайте первую заявку!
            </Alert>
          ) : (
            <Box sx={{ width: '100%' }}>
              {userTickets.slice(-3).map(ticket => (
                <TicketCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  onClick={() => handleTicketClick(ticket.id)}
                />
              ))}
            </Box>
          )}
          </Box>
      </Box>

      {/* Кнопка создания заявки */}
      <Box 
                          sx={{ 
          position: 'fixed', 
          bottom: 75, 
          right: 20,
          zIndex: 999
        }}
      >
        <Fab 
                                color="primary"
                                sx={{ 
            boxShadow: '0 4px 10px rgba(0,0,0,0.25)'
          }}
          onClick={handleCreateTicket}
        >
          <AddIcon />
        </Fab>
                          </Box>
      
      {/* Выдвижной фильтр */}
      <SwipeableDrawer
        anchor="bottom"
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onOpen={() => setFilterDrawerOpen(true)}
        swipeAreaWidth={0}
        disableSwipeToOpen
                  sx={{
          '& .MuiDrawer-paper': {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '80%'
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Фильтры</Typography>
            <IconButton onClick={() => setFilterDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
              </Box>
          <Divider sx={{ mb: 2 }} />
          {/* Здесь будут фильтры */}
      </Box>
      </SwipeableDrawer>
    </Box>
  );
};

export default DashboardPage; 