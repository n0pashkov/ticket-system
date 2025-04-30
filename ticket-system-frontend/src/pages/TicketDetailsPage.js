import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTicket } from '../hooks/useTickets';
import { ticketsAPI } from '../api/api';
import { useUsers } from '../hooks/useUsers';
import EditIcon from '@mui/icons-material/Edit';

// Material UI компоненты
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  TextField,
  Typography,
  Alert,
  Avatar,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Paper
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
  Delete as DeleteIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayArrowIcon,
  Settings as SettingsIcon,
  Engineering as EngineeringIcon,
  AssignmentInd as AssignmentIndIcon,
  Home as HomeIcon,
  Room as RoomIcon
} from '@mui/icons-material';

// Цвета для статусов
const statusColors = {
  'new': '#ffa726',
  'in_progress': '#29b6f6',
  'closed': '#66bb6a'
};

// Цвета для приоритетов
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

const TicketDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actionError, setActionError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { users, getUserById } = useUsers();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    priority: '',
    room_number: ''
  });
  const [editFormErrors, setEditFormErrors] = useState({
    title: '',
    description: '',
    room_number: ''
  });

  const { 
    ticket, 
    isLoading, 
    isError, 
    error
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
      setEditFormData({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        room_number: ticket.room_number || ''
      });
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

  const handleEditTicket = async () => {
    // Валидация формы
    let valid = true;
    const errors = {
      title: '',
      description: '',
      room_number: ''
    };

    if (!editFormData.title.trim()) {
      errors.title = 'Заголовок обязателен';
      valid = false;
    } else if (editFormData.title.length < 3) {
      errors.title = 'Заголовок должен содержать не менее 3 символов';
      valid = false;
    }

    if (!editFormData.description.trim()) {
      errors.description = 'Описание обязательно';
      valid = false;
    } else if (editFormData.description.length < 10) {
      errors.description = 'Описание должно содержать не менее 10 символов';
      valid = false;
    }
    
    if (!editFormData.room_number.trim()) {
      errors.room_number = 'Номер кабинета обязателен';
      valid = false;
    }

    setEditFormErrors(errors);
    if (!valid) return;

    try {
      await ticketsAPI.update(id, editFormData);
      setSuccessMessage('Тикет успешно обновлен');
      setEditDialogOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Ошибка при обновлении тикета:', err);
      setActionError('Не удалось обновить тикет.');
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Сбросить ошибку для этого поля при изменении
    if (editFormErrors[name]) {
      setEditFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Является ли пользователь администратором
  const isAdmin = user?.role === 'admin';
  
  // Является ли пользователь агентом или администратором
  const isAgentOrAdmin = user && ['agent', 'admin'].includes(user.role);
  
  // Может ли пользователь редактировать тикет (админ, агент или создатель)
  const canEdit = isAgentOrAdmin || (user && ticket && user.id === ticket.creator_id);
  
  // Показывать ли кнопку "взять в работу" (для агентов, когда тикет новый)
  const showSelfAssignButton = isAgentOrAdmin && ticket && ticket.status === 'new';
  
  // Показывать ли кнопку "закрыть" (для агентов, когда тикет в работе и назначен на текущего агента)
  const showCloseButton = isAgentOrAdmin && ticket && ticket.status === 'in_progress' && 
    (isAdmin || (user && ticket.assigned_to_id === user.id));
  
  // Показывать ли кнопку "удалить" (только для администраторов)
  const showDeleteButton = isAdmin && ticket;

  if (isLoading) {
    return (
      <Box sx={{ 
        width: '100%', 
        p: 2,
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !ticket) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error?.message || 'Не удалось загрузить данные заявки.'}
        </Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate('/tickets')}
          sx={{ borderRadius: 2 }}
        >
          Вернуться к списку заявок
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100vw', 
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box',
      p: 2
    }}>
      {/* Панель с кнопкой назад и заголовком */}
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
            onClick={() => navigate('/tickets')}
            sx={{ 
              mr: 1,
              backgroundColor: 'rgba(25, 118, 210, 0.08)'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Заявка №{ticket.id}
          </Typography>
        </Box>
        
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Редактировать
          </Button>
        )}
      </Box>

      {/* Сообщения об ошибках */}
      {actionError && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setActionError(null)}
        >
          {actionError}
        </Alert>
      )}

      {/* Основная информация о заявке */}
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
              <AssignmentIcon fontSize="large" />
            </Avatar>
            <Box sx={{ ml: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                {ticket.title}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                <Chip 
                  label={formatStatus(ticket.status)} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    color: 'white',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
                <Chip 
                  label={formatPriority(ticket.priority)} 
                  size="small"
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    color: 'white',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Информация о заявке */}
        <Grid item xs={12} md={8}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              overflow: 'hidden',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <DescriptionIcon sx={{ mr: 1, color: 'action.active' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Описание
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                {ticket.description}
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <RoomIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
                  <Typography variant="body2" color="textSecondary">
                    Кабинет: {ticket.room_number || 'Не указан'}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
                  <Typography variant="body2" color="textSecondary">
                    Создана: {formatDate(ticket.created_at)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <TimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', fontSize: '1rem' }} />
                  <Typography variant="body2" color="textSecondary">
                    Обновлена: {formatDate(ticket.updated_at)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Информация о пользователях */}
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              overflow: 'hidden',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              height: '100%'
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Участники
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Создатель:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: 'primary.main',
                      fontSize: '0.8rem',
                      mr: 1
                    }}
                  >
                    {ticket.creator_id ? getCreatorName(ticket.creator_id).substring(0, 2) : "?"}
                  </Avatar>
                  <Typography variant="body2">
                    {getCreatorName(ticket.creator_id)}
                  </Typography>
                </Box>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 600 }}>
                  Исполнитель:
                </Typography>
                {ticket.assigned_to_id ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      sx={{ 
                        width: 32, 
                        height: 32, 
                        bgcolor: '#29b6f6',
                        fontSize: '0.8rem',
                        mr: 1
                      }}
                    >
                      <EngineeringIcon fontSize="small" />
                    </Avatar>
                    <Typography variant="body2">
                      {getAssigneeName(ticket.assigned_to_id)}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Исполнитель не назначен
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Кнопки действий */}
      {(showSelfAssignButton || showCloseButton || showDeleteButton) && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          mt: 3, 
          mb: 3 
        }}>
          {showSelfAssignButton && (
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AssignmentIndIcon />} 
              onClick={handleSelfAssign}
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
              }}
            >
              Взять в работу
            </Button>
          )}
          
          {showCloseButton && (
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<CheckCircleIcon />} 
              onClick={handleCloseTicket}
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 4px 10px rgba(102, 187, 106, 0.3)'
              }}
            >
              Отметить как выполненную
            </Button>
          )}
          
          {showDeleteButton && (
            <Button 
              variant="contained" 
              color="error" 
              startIcon={<DeleteIcon />} 
              onClick={() => setDeleteDialogOpen(true)}
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 4px 10px rgba(244, 67, 54, 0.3)'
              }}
            >
              Удалить заявку
            </Button>
          )}
        </Box>
      )}

      {/* Диалог редактирования заявки */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Редактирование заявки
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="title"
            label="Заголовок"
            fullWidth
            variant="outlined"
            value={editFormData.title}
            onChange={handleEditFormChange}
            error={!!editFormErrors.title}
            helperText={editFormErrors.title}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Описание"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={editFormData.description}
            onChange={handleEditFormChange}
            error={!!editFormErrors.description}
            helperText={editFormErrors.description}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <TextField
            margin="dense"
            name="room_number"
            label="Номер кабинета"
            fullWidth
            variant="outlined"
            value={editFormData.room_number}
            onChange={handleEditFormChange}
            error={!!editFormErrors.room_number}
            helperText={editFormErrors.room_number}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <FormControl 
            fullWidth 
            margin="dense"
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          >
            <InputLabel>Приоритет</InputLabel>
            <Select
              name="priority"
              value={editFormData.priority}
              onChange={handleEditFormChange}
              label="Приоритет"
            >
              <MenuItem value="low">Низкий</MenuItem>
              <MenuItem value="medium">Средний</MenuItem>
              <MenuItem value="high">Высокий</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleEditTicket} 
            variant="contained"
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
            }}
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          Удаление заявки
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить эту заявку? Это действие нельзя отменить.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleDeleteTicket} 
            color="error" 
            variant="contained"
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 10px rgba(244, 67, 54, 0.3)'
            }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>

      {/* Снэкбар с сообщением об успешном действии */}
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
    </Box>
  );
};

export default TicketDetailsPage; 