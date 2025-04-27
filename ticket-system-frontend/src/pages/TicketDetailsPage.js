import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTicket } from '../hooks/useTickets';
import { ticketsAPI } from '../api/api';
import { useUsers } from '../hooks/useUsers';

// Material UI компоненты
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  Avatar,
  Snackbar,
  Container,
} from '@mui/material';

// Material UI иконки
import {
  AccessTime as TimeIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Comment as CommentIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

// Цвета для статусов, как в таблице
const statusColors = {
  'new': 'warning',
  'in_progress': 'info',
  'closed': 'success'
};

// Цвета для приоритетов, как в таблице
const priorityColors = {
  'low': 'success',
  'medium': 'warning',
  'high': 'error'
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

const TicketDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [actionError, setActionError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { users, getUserById } = useUsers();

  const { 
    ticket, 
    comments, 
    isLoading, 
    isError, 
    error, 
    addComment 
  } = useTicket(id);

  // Получение тикета из кэша
  useEffect(() => {
    if (ticket) {
      console.log("Данные заявки:", ticket);
      console.log("Ответственный (assigned_to_id):", ticket.assigned_to_id);
      if (ticket.assigned_to) {
        console.log("Ответственный (объект):", ticket.assigned_to);
      } else {
        console.log("Отсутствует данные об объекте assigned_to");
      }
    }
  }, [ticket]);

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указано';
    try {
      const date = new Date(dateString);
      
      if (isNaN(date.getTime())) {
        console.error("Неверный формат даты:", dateString);
        return 'Некорректная дата';
      }
      
      // Форматируем как "25 апреля 2025, 23:00"
      const day = date.getDate();
      
      // Используем родительный падеж для месяца
      const monthNames = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
      ];
      const month = monthNames[date.getMonth()];
      
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${day} ${month} ${year}, ${hours}:${minutes}`;
    } catch (error) {
      console.error("Ошибка при форматировании даты:", error);
      return 'Ошибка даты';
    }
  };

  // Получение имени автора тикета по ID
  const getCreatorName = (creatorId) => {
    if (!creatorId) return "Не указан";
    const creator = getUserById(creatorId);
    return creator?.full_name || "Не указан";
  };

  // Получение имени исполнителя тикета по ID
  const getAssigneeName = (assignedToId) => {
    if (!assignedToId) return "Не назначен";
    const assignee = getUserById(assignedToId);
    return assignee?.full_name || "Не найден в системе";
  };

  // Обработчики действий
  const handleSelfAssign = async () => {
    try {
      setActionError(null);
      await ticketsAPI.selfAssign(id);
      setSuccessMessage('Тикет успешно взят в работу');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Ошибка при взятии тикета в работу:', err);
      setActionError('Не удалось взять тикет в работу.');
    }
  };

  const handleCloseTicket = async () => {
    try {
      setActionError(null);
      await ticketsAPI.closeTicket(id);
      setSuccessMessage('Тикет успешно закрыт');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Ошибка при закрытии тикета:', err);
      setActionError('Не удалось закрыть тикет.');
    }
  };

  const handleDeleteTicket = async () => {
    try {
      setActionError(null);
      await ticketsAPI.delete(id);
      setSuccessMessage(isAdmin ? 'Тикет успешно удален' : 'Тикет успешно скрыт');
      navigate('/tickets');
    } catch (err) {
      console.error('Ошибка при удалении тикета:', err);
      setActionError('Не удалось удалить тикет.');
      setDeleteDialogOpen(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addComment({ content: newComment });
      setNewComment('');
    } catch (err) {
      console.error('Ошибка при добавлении комментария:', err);
      setActionError('Не удалось добавить комментарий.');
    }
  };

  // Проверка прав доступа
  const isAdmin = user?.role === 'admin';
  const isAgent = user?.role === 'agent';
  const isCreator = ticket?.creator_id === user?.id;
  const isAssigned = ticket?.assigned_to_id === user?.id;

  // Определение доступных действий
  const canTakeTicket = (isAdmin || isAgent) && 
                      (ticket?.status === 'new' || ticket?.status === 'open' || 
                      (isAdmin && ticket?.status !== 'closed'));
  const canCloseTicket = (isAdmin || (isAgent && isAssigned) || isCreator) && 
                       (ticket?.status === 'new' || ticket?.status === 'open' || 
                        ticket?.status === 'in_progress' || 
                        (isAdmin && ticket?.status !== 'closed'));
  const canCompleteTicket = (isAdmin || (isAgent && isAssigned)) && 
                         (ticket?.status === 'in_progress' || isAdmin);
  const canDeleteTicket = isAdmin || isCreator;

  if (isLoading) return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Typography variant="h6">Загрузка...</Typography>
    </Box>
  );
  
  if (isError) return (
    <Alert severity="error" sx={{ m: 2 }}>
      {error?.message || 'Ошибка при загрузке тикета'}
    </Alert>
  );
  
  if (!ticket) return (
    <Alert severity="warning" sx={{ m: 2 }}>
      Тикет не найден
    </Alert>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Заголовок и кнопка назад */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" display="flex" alignItems="center">
          <AssignmentIcon sx={{ mr: 1 }} />
          Тикет #{ticket.id}: {ticket.title}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
        >
          НАЗАД
        </Button>
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {actionError}
        </Alert>
      )}

      {/* Основная информация о тикете - по макету со скриншота */}
      <Paper 
        elevation={0}
        sx={{ 
          mb: 3, 
          p: 3, 
          border: '1px solid #e0e0e0', 
          borderRadius: 1, 
          bgcolor: 'white' 
        }}
      >
        {/* Статус и приоритет как на скриншоте */}
        <Box sx={{ display: 'flex', mb: 4 }}>
          <Chip 
            label={formatStatus(ticket.status)} 
            color={statusColors[ticket.status] || 'default'}
            sx={{ 
              borderRadius: '20px',
              mr: 2
            }}
          />
          <Chip 
            label={`Приоритет: ${formatPriority(ticket.priority)}`} 
            color={priorityColors[ticket.priority] || 'default'}
            sx={{ 
              borderRadius: '20px'
            }}
          />
        </Box>

        {/* Информация о тикете в 4 колонки */}
        <Grid container spacing={4}>
          {/* Создан */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <CalendarIcon color="primary" sx={{ mt: 0.5, mr: 1 }} />
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Создан:
                </Typography>
                <Typography variant="body1">
                  {formatDate(ticket.created_at)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Автор */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <PersonIcon color="primary" sx={{ mt: 0.5, mr: 1 }} />
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Автор:
                </Typography>
                <Typography variant="body1">
                  {getCreatorName(ticket.creator_id)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Обновлен */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <TimeIcon color="primary" sx={{ mt: 0.5, mr: 1 }} />
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Обновлен:
                </Typography>
                <Typography variant="body1">
                  {formatDate(ticket.updated_at)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Ответственный */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <PersonIcon color="primary" sx={{ mt: 0.5, mr: 1 }} />
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Ответственный:
                </Typography>
                <Typography variant="body1">
                  {getAssigneeName(ticket.assigned_to_id)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Карточки для нижних секций */}
      <Grid container spacing={3}>
        {/* Действия */}
        <Grid item xs={12} md={4}>
          <Card 
            elevation={0} 
            sx={{ 
              border: '1px solid #e0e0e0', 
              height: '100%'
            }}
          >
            <CardHeader 
              title={
                <Box display="flex" alignItems="center">
                  <SettingsIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Действия</Typography>
                </Box>
              }
              sx={{ 
                borderBottom: '1px solid #e0e0e0',
                p: 2
              }}
            />
            <CardContent sx={{ p: 2 }}>
              {isAdmin && (
                <Box sx={{ mb: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Роль: admin
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {/* Кнопка взятия в работу */}
                {canTakeTicket && !ticket.assigned_to_id && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleSelfAssign}
                  >
                    ВЗЯТЬ В РАБОТУ
                  </Button>
                )}
                
                {/* Кнопка закрытия заявки */}
                {canCloseTicket && ticket.status !== 'closed' && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="success"
                    startIcon={<CheckCircleIcon />}
                    onClick={handleCloseTicket}
                  >
                    ОТМЕТИТЬ КАК ВЫПОЛНЕННУЮ
                  </Button>
                )}
                
                {/* Кнопка удаления заявки */}
                {canDeleteTicket && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    УДАЛИТЬ ЗАЯВКУ
                  </Button>
                )}
              </Box>
              
              {!canDeleteTicket && !canTakeTicket && !canCloseTicket && (
                <Typography color="text.secondary" align="center" variant="body2">
                  Нет доступных действий
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Описание тикета */}
        <Grid item xs={12} md={8}>
          <Card 
            elevation={0} 
            sx={{ 
              border: '1px solid #e0e0e0', 
              height: '100%'
            }}
          >
            <CardHeader 
              title={
                <Box display="flex" alignItems="center">
                  <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Описание</Typography>
                </Box>
              }
              sx={{ 
                borderBottom: '1px solid #e0e0e0',
                p: 2
              }}
            />
            <CardContent sx={{ p: 2 }}>
              <Typography variant="body1">
                {ticket.description}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Комментарии */}
        <Grid item xs={12}>
          <Card 
            elevation={0} 
            sx={{ 
              border: '1px solid #e0e0e0'
            }}
          >
            <CardHeader 
              title={
                <Box display="flex" alignItems="center">
                  <CommentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Комментарии ({comments.length})</Typography>
                </Box>
              }
              sx={{ 
                borderBottom: '1px solid #e0e0e0',
                p: 2
              }}
            />
            <CardContent sx={{ p: 2 }}>
              {comments.length === 0 ? (
                <Typography variant="body1" color="text.secondary">
                  Нет комментариев
                </Typography>
              ) : (
                <Box>
                  {comments.map(comment => (
                    <Box 
                      key={comment.id} 
                      sx={{ 
                        mb: 2, 
                        pb: 2, 
                        borderBottom: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              mr: 1, 
                              backgroundColor: 'primary.main' 
                            }}
                          >
                            U
                          </Avatar>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Неизвестный пользователь
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(comment.created_at)}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="body1" 
                        sx={{ mt: 1, pl: '40px' }}
                        component="div"
                        whiteSpace="pre-line"
                      >
                        {comment.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Форма добавления комментария */}
              <Box 
                component="form" 
                onSubmit={handleSubmitComment} 
                sx={{ mt: 3 }}
              >
                <TextField
                  fullWidth
                  placeholder="Добавить коммента..."
                  multiline
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    endIcon={<SendIcon />}
                    disabled={!newComment.trim()}
                    sx={{ 
                      bgcolor: 'grey.400',
                      '&:hover': { bgcolor: 'grey.500' }
                    }}
                  >
                    ОТПРАВИТЬ
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Удаление тикета</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isAdmin ? (
              `Вы действительно хотите удалить тикет #${ticket.id}: ${ticket.title}? Это действие нельзя будет отменить.`
            ) : (
              `Вы действительно хотите скрыть тикет #${ticket.id}: ${ticket.title}? Вы больше не будете видеть эту заявку, но администраторы и технические специалисты по-прежнему будут иметь к ней доступ.`
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Отмена
          </Button>
          <Button onClick={handleDeleteTicket} color="error" startIcon={<DeleteIcon />}>
            {isAdmin ? 'Удалить' : 'Скрыть'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Уведомление об успешном действии */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />
    </Container>
  );
};

export default TicketDetailsPage; 