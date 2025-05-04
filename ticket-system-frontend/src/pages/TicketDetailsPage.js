import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTicket } from '../hooks/useTickets';
import { ticketsAPI } from '../api/api';
import { useUsers } from '../hooks/useUsers';
import { useEquipmentByCategory } from '../hooks/useEquipment';
import { categoriesAPI } from '../api/api';
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
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
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
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Engineering as EngineeringIcon,
  AssignmentInd as AssignmentIndIcon,
  Room as RoomIcon,
  Message as MessageIcon,
  Comment as CommentIcon,
  Category as CategoryIcon,
  Devices as DevicesIcon
} from '@mui/icons-material';

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
  const { getUserById } = useUsers();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [closeWithMessageDialogOpen, setCloseWithMessageDialogOpen] = useState(false);
  const [closeMessage, setCloseMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
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
  const [category, setCategory] = useState(null);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState(null);

  const { 
    ticket, 
    isLoading, 
    isError, 
    error
  } = useTicket(id);
  
  // Получаем оборудование связанное с категорией
  const { 
    equipment: allEquipmentInCategory, 
    isLoading: equipmentLoading, 
    isError: equipmentError 
  } = useEquipmentByCategory(ticket?.category_id);
  
  // Получаем все оборудование из категории, но отмечаем связанное с заявкой
  const equipment = useMemo(() => {
    console.log("Данные заявки для фильтрации оборудования:", ticket);
    console.log("ID оборудования в заявке:", ticket?.equipment_id);
    console.log("Доступное оборудование категории:", allEquipmentInCategory);
    
    // Если нет данных оборудования категории, возвращаем пустой массив
    if (!allEquipmentInCategory || !Array.isArray(allEquipmentInCategory)) {
      console.log("Нет данных оборудования категории");
      return [];
    }

    // Создаем копию массива оборудования и добавляем флаг isRelatedToTicket,
    // который показывает, привязано ли это оборудование к текущей заявке
    return allEquipmentInCategory.map(item => ({
      ...item,
      isRelatedToTicket: Number(ticket?.equipment_id) === Number(item.id)
    }));
  }, [ticket, allEquipmentInCategory]);

  // Функция загрузки сообщений (обернутая в useCallback)
  const loadMessages = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoadingMessages(true);
      const response = await ticketsAPI.getMessages(id);
      setMessages(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке сообщений:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [id]);

  // Функция загрузки категории
  const loadCategory = useCallback(async () => {
    if (!ticket?.category_id) return;
    
    try {
      setCategoryLoading(true);
      setCategoryError(null);
      const response = await categoriesAPI.getById(ticket.category_id);
      setCategory(response.data);
    } catch (err) {
      console.error('Ошибка при загрузке категории:', err);
      setCategoryError('Не удалось загрузить информацию о категории');
    } finally {
      setCategoryLoading(false);
    }
  }, [ticket?.category_id]);

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
      
      // Загружаем сообщения заявки
      loadMessages();
      
      // Загружаем категорию заявки
      loadCategory();
    }
  }, [ticket, loadMessages, loadCategory]);

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

  // Обработчик для закрытия заявки с сообщением
  const handleCloseTicketWithMessage = async () => {
    if (!closeMessage.trim()) {
      setActionError('Введите сообщение для закрытия заявки');
      return;
    }
    
    try {
      setActionError(null);
      await ticketsAPI.closeTicketWithMessage(id, closeMessage);
      setSuccessMessage('Заявка успешно закрыта');
      setCloseWithMessageDialogOpen(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Ошибка при закрытии заявки с сообщением:', err);
      setActionError('Не удалось закрыть заявку.');
    }
  };

  // Показывать ли кнопку "закрыть с сообщением" (для агентов, когда тикет в работе и назначен на текущего агента)
  const showCloseWithMessageButton = isAgentOrAdmin && ticket && ticket.status === 'in_progress' && 
    (isAdmin || (user && ticket.assigned_to_id === user.id));

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
      p: { xs: 1, sm: 2 },
      bgcolor: 'background.default'
    }}>
      {/* Панель с кнопкой назад и заголовком */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 2,
        width: '100%',
        gap: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            color="primary" 
            onClick={() => navigate('/tickets')}
            sx={{ 
              mr: 1,
              backgroundColor: 'action.hover'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Заявка №{ticket.id}
          </Typography>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          flexWrap: 'wrap',
          alignItems: 'center',
          ml: { xs: 0, sm: 'auto' }
        }}>
          <Chip 
            label={formatStatus(ticket.status)} 
            size="medium" 
            color={
              ticket.status === 'new' ? 'info' :
              ticket.status === 'in_progress' ? 'warning' :
              ticket.status === 'closed' ? 'success' : 'default'
            }
            sx={{ fontWeight: 500 }}
          />
          <Chip 
            label={formatPriority(ticket.priority)} 
            size="medium"
            color={
              ticket.priority === 'high' ? 'error' :
              ticket.priority === 'medium' ? 'warning' :
              'default'
            }
            sx={{ fontWeight: 500 }}
          />
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
          background: (theme) => theme.palette.mode === 'dark' 
            ? 'linear-gradient(120deg, #1565c0 0%, #0d47a1 100%)' 
            : 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)',
          color: 'white',
          boxShadow: (theme) => `0 4px 20px ${theme.palette.mode === 'dark' 
            ? 'rgba(16, 37, 63, 0.5)' 
            : 'rgba(33, 150, 243, 0.3)'}`,
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2
          }}>
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
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem', mb: 1 }}>
                {ticket.title}
              </Typography>
              <Grid container spacing={2} sx={{ color: 'rgba(255,255,255,0.9)' }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <RoomIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      Каб: {ticket.room_number || 'Не указан'}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CalendarIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2">
                      {formatDate(ticket.created_at).split(',')[0]}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" noWrap>
                      {getCreatorName(ticket.creator_id)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <EngineeringIcon fontSize="small" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" noWrap>
                      {ticket.assigned_to_id ? getAssigneeName(ticket.assigned_to_id) : 'Не назначен'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
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
              boxShadow: (theme) => `0 4px 8px ${theme.palette.mode === 'dark' 
                ? 'rgba(0, 0, 0, 0.4)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
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
              
              <Typography variant="body1" sx={{ 
                whiteSpace: 'pre-wrap', 
                mb: 3,
                p: 1,
                bgcolor: 'action.hover',
                borderRadius: 2,
                borderLeft: '4px solid',
                borderColor: 'primary.main',
              }}>
                {ticket.description}
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Дополнительная информация:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      boxShadow: (theme) => `0 2px 4px ${theme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.2)' 
                        : 'rgba(0, 0, 0, 0.05)'}`,
                    }}>
                      <RoomIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Кабинет
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {ticket.room_number || 'Не указан'}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      boxShadow: (theme) => `0 2px 4px ${theme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.2)' 
                        : 'rgba(0, 0, 0, 0.05)'}`,
                    }}>
                      <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Создана
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatDate(ticket.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      boxShadow: (theme) => `0 2px 4px ${theme.palette.mode === 'dark' 
                        ? 'rgba(0, 0, 0, 0.2)' 
                        : 'rgba(0, 0, 0, 0.05)'}`,
                    }}>
                      <TimeIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }} />
                      <Box>
                        <Typography variant="caption" color="textSecondary">
                          Обновлена
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatDate(ticket.updated_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
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
              boxShadow: (theme) => `0 4px 8px ${theme.palette.mode === 'dark' 
                ? 'rgba(0, 0, 0, 0.4)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
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
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ 
                  mb: 1, 
                  fontWeight: 600, 
                  display: 'flex', 
                  alignItems: 'center'
                }}>
                  <PersonIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                  Создатель:
                </Typography>
                <Paper
                  elevation={0}
                  sx={{ 
                    p: 1.5, 
                    borderRadius: 2, 
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 40, 
                      height: 40, 
                      bgcolor: 'primary.main',
                      fontSize: '1rem',
                      mr: 1.5
                    }}
                  >
                    {ticket.creator_id ? getCreatorName(ticket.creator_id).substring(0, 2) : "?"}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {getCreatorName(ticket.creator_id)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Создал заявку {formatDate(ticket.created_at).split(',')[0]}
                    </Typography>
                  </Box>
                </Paper>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" sx={{ 
                  mb: 1, 
                  fontWeight: 600,
                  display: 'flex', 
                  alignItems: 'center'
                }}>
                  <EngineeringIcon fontSize="small" sx={{ mr: 0.5, color: '#29b6f6' }} />
                  Исполнитель:
                </Typography>
                {ticket.assigned_to_id ? (
                  <Paper
                    elevation={0}
                    sx={{ 
                      p: 1.5, 
                      borderRadius: 2, 
                      bgcolor: (theme) => theme.palette.mode === 'dark' 
                        ? 'rgba(41, 182, 246, 0.15)' 
                        : 'rgba(41, 182, 246, 0.1)',
                      border: '1px solid',
                      borderColor: (theme) => theme.palette.mode === 'dark' 
                        ? 'rgba(41, 182, 246, 0.4)' 
                        : 'rgba(41, 182, 246, 0.3)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        bgcolor: '#29b6f6',
                        fontSize: '1rem',
                        mr: 1.5
                      }}
                    >
                      <EngineeringIcon fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {getAssigneeName(ticket.assigned_to_id)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {ticket.status === 'in_progress' ? 'Работает над заявкой' : 
                         ticket.status === 'closed' ? 'Выполнил заявку' : 'Назначен на заявку'}
                      </Typography>
                    </Box>
                  </Paper>
                ) : (
                  <Paper
                    elevation={0}
                    sx={{ 
                      p: 1.5, 
                      borderRadius: 2, 
                      bgcolor: 'background.paper',
                      border: '1px dashed',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        bgcolor: 'action.disabledBackground',
                        fontSize: '1rem',
                        mr: 1.5
                      }}
                    >
                      <EngineeringIcon fontSize="small" color="disabled" />
                    </Avatar>
                    <Typography variant="body2" color="textSecondary">
                      Исполнитель не назначен
                    </Typography>
                  </Paper>
                )}
                
                {showSelfAssignButton && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    startIcon={<AssignmentIndIcon />}
                    onClick={handleSelfAssign}
                    sx={{ mt: 2, borderRadius: 2 }}
                  >
                    Взять в работу
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Категория и оборудование */}
        <Grid item xs={12}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              overflow: 'hidden',
              boxShadow: (theme) => `0 4px 8px ${theme.palette.mode === 'dark' 
                ? 'rgba(0, 0, 0, 0.4)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
              mb: 3,
              width: '100%'
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DevicesIcon sx={{ mr: 1, color: 'action.active' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Оборудование
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {/* Информация о категории */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ mb: { xs: 2, md: 0 } }}>
                    {categoryLoading ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        <Typography variant="body2">Загрузка категории...</Typography>
                      </Box>
                    ) : categoryError ? (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {categoryError}
                      </Alert>
                    ) : category ? (
                      <Box>
                        <Typography variant="subtitle2" sx={{ 
                          mb: 1, 
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <CategoryIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                          Категория:
                        </Typography>
                        <Paper
                          elevation={0}
                          sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            bgcolor: (theme) => theme.palette.mode === 'dark' 
                              ? 'rgba(25, 118, 210, 0.15)' 
                              : 'rgba(25, 118, 210, 0.05)',
                            border: '1px solid',
                            borderColor: 'primary.light',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: 'primary.main' }}>
                            {category.name}
                          </Typography>
                          {category.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                              {category.description}
                            </Typography>
                          )}
                        </Paper>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Категория не указана
                      </Typography>
                    )}
                  </Box>
                </Grid>

                {/* Информация об оборудовании */}
                <Grid item xs={12} md={8}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <DevicesIcon fontSize="small" sx={{ mr: 0.5, color: 'primary.main' }} />
                    {(() => {
                      if (equipment && equipment.filter(item => item.isRelatedToTicket).length > 0) {
                        return "Оборудование, связанное с заявкой:";
                      }
                      return "Связанное оборудование:";
                    })()}
                  </Typography>
                  
                  {equipmentLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      <Typography variant="body2">Загрузка оборудования...</Typography>
                    </Box>
                  ) : equipmentError ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      Не удалось загрузить данные об оборудовании
                    </Alert>
                  ) : equipment && equipment.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {(() => {
                        const relatedEquipment = equipment.filter(item => item.isRelatedToTicket);
                        if (relatedEquipment.length === 0) {
                          return (
                            <Typography variant="body2" color="text.secondary">
                              Нет связанного оборудования для этой заявки
                            </Typography>
                          );
                        }
                        return relatedEquipment.map((item) => (
                          <Paper 
                            key={item.id}
                            sx={{ 
                              p: 2, 
                              borderRadius: 2, 
                              border: '1px solid',
                              borderColor: 'primary.main',
                              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(50% - 8px)' },
                              display: 'flex',
                              flexDirection: 'column',
                              minWidth: 250,
                              backgroundColor: (theme) => theme.palette.mode === 'dark' 
                                ? 'rgba(25, 118, 210, 0.15)' 
                                : 'rgba(25, 118, 210, 0.05)',
                              position: 'relative'
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, width: '100%' }}>
                              <DevicesIcon fontSize="small" sx={{ 
                                mr: 1, 
                                color: 'primary.main', 
                                flexShrink: 0 
                              }} />
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  fontWeight: 700,
                                  wordBreak: 'break-word',
                                  color: 'primary.main'
                                }}
                              >
                                {item.name}
                              </Typography>
                            </Box>
                            
                            <Grid container spacing={1} sx={{ mb: 'auto' }}>
                              <Grid item xs={6}>
                                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                                  Модель:
                                </Typography>
                                <Typography variant="body2" component="div" sx={{ fontWeight: 500 }}>
                                  {item.model || 'Не указана'}
                                </Typography>
                              </Grid>
                              <Grid item xs={6}>
                                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                                  S/N:
                                </Typography>
                                <Typography variant="body2" component="div" sx={{ fontWeight: 500 }}>
                                  {item.serial_number || 'Не указан'}
                                </Typography>
                              </Grid>
                              <Grid item xs={12}>
                                <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                                  Местоположение:
                                </Typography>
                                <Typography variant="body2" component="div" sx={{ fontWeight: 500 }}>
                                  {item.location || 'Не указано'}
                                </Typography>
                              </Grid>
                            </Grid>
                            
                            {item.status && (
                              <Chip 
                                label={item.status === 'working' ? 'Работает' : 
                                       item.status === 'maintenance' ? 'На обслуживании' : 
                                       item.status === 'broken' ? 'Неисправен' : 
                                       item.status === 'active' ? 'Активен' : item.status}
                                size="small"
                                color={
                                  item.status === 'working' || item.status === 'active' ? 'success' :
                                  item.status === 'maintenance' ? 'warning' :
                                  item.status === 'broken' ? 'error' : 'default'
                                }
                                sx={{ 
                                  mt: 1,
                                  alignSelf: 'flex-start'
                                }}
                              />
                            )}
                          </Paper>
                        ));
                      })()}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Нет связанного оборудования
                    </Typography>
                  )}
                </Grid>
              </Grid>

            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Кнопки действий */}
      {(showSelfAssignButton || showCloseButton || showDeleteButton || showCloseWithMessageButton) && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 2, 
          mt: 3, 
          mb: 3,
          justifyContent: { xs: 'center', sm: 'flex-start' } 
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
          
          {showCloseWithMessageButton && (
            <Button 
              variant="contained" 
              color="success" 
              startIcon={<CommentIcon />} 
              onClick={() => setCloseWithMessageDialogOpen(true)}
              sx={{ 
                borderRadius: 2,
                boxShadow: '0 4px 10px rgba(102, 187, 106, 0.3)'
              }}
            >
              Закрыть с сообщением
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

      {/* Секция сообщений заявки */}
      {messages.length > 0 ? (
        <Box sx={{ mt: 4 }}>
          <Card 
            sx={{ 
              borderRadius: 4, 
              overflow: 'hidden',
              boxShadow: (theme) => `0 4px 8px ${theme.palette.mode === 'dark' 
                ? 'rgba(0, 0, 0, 0.4)' 
                : 'rgba(0, 0, 0, 0.1)'}`,
              bgcolor: 'background.paper'
            }}
          >
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <MessageIcon sx={{ mr: 1, color: 'action.active' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Сообщения заявки
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    bgcolor: (theme) => theme.palette.mode === 'dark' 
                      ? 'primary.dark' 
                      : 'primary.main', 
                    color: 'white', 
                    borderRadius: 10, 
                    px: 1, 
                    py: 0.25, 
                    ml: 1 
                  }}
                >
                  {messages.length}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />

              {loadingMessages ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress size={30} />
                </Box>
              ) : (
                <List sx={{ 
                  width: '100%', 
                  p: 0,
                  '& .MuiListItem-root': {
                    bgcolor: 'transparent'
                  }
                }}>
                  {messages.map((message, index) => (
                    <React.Fragment key={message.id}>
                      <Box 
                        sx={{ 
                          py: 1.5,
                          px: 1,
                          mb: 1,
                          borderRadius: 2,
                          bgcolor: (theme) => index % 2 === 0 
                            ? theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.03)' 
                              : 'rgba(0, 0, 0, 0.02)'
                            : 'transparent'
                        }}
                      >
                        <ListItem 
                          alignItems="flex-start" 
                          sx={{ 
                            p: 0,
                            bgcolor: 'transparent'
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ 
                              bgcolor: message.user_id === ticket.creator_id ? 'primary.main' : 
                                       message.user_id === ticket.assigned_to_id ? '#29b6f6' : 'secondary.main'
                            }}>
                              {message.user_id === ticket.creator_id ? <PersonIcon /> : 
                               message.user_id === ticket.assigned_to_id ? <EngineeringIcon /> : <PersonIcon />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  {getUserById(message.user_id)?.full_name || "Пользователь"}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatDate(message.created_at)}
                                </Typography>
                              </Box>
                            }
                            secondary={
                              <Typography
                                component="div"
                                variant="body2"
                                color="text.primary"
                                sx={{ 
                                  display: 'block', 
                                  mt: 1,
                                  p: 1.5,
                                  bgcolor: (theme) => theme.palette.mode === 'dark' 
                                    ? 'rgba(255, 255, 255, 0.05)' 
                                    : 'background.paper',
                                  borderRadius: 2,
                                  border: '1px solid',
                                  borderColor: 'divider'
                                }}
                              >
                                {message.message}
                              </Typography>
                            }
                          />
                        </ListItem>
                      </Box>
                      {index < messages.length - 1 && (
                        <Divider variant="inset" component="li" sx={{ my: 0 }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      ) : loadingMessages ? (
        <Box sx={{ mt: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={24} sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Загрузка сообщений...
          </Typography>
        </Box>
      ) : null}

      {/* Диалог редактирования заявки */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          alignItems: 'center' 
        }}>
          <EditIcon sx={{ mr: 1, color: 'primary.main' }} />
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
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center',
          color: 'error.main'
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Удаление заявки
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Вы уверены, что хотите удалить эту заявку? Это действие нельзя отменить.
          </DialogContentText>
          <Box sx={{ 
            p: 2, 
            mt: 2, 
            bgcolor: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(211, 47, 47, 0.2)' 
              : 'error.light', 
            color: (theme) => theme.palette.mode === 'dark'
              ? theme.palette.error.light
              : theme.palette.error.dark,
            borderRadius: 2,
            fontSize: '0.875rem',
            border: '1px solid',
            borderColor: 'error.main'
          }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Внимание!
            </Typography>
            <Typography variant="body2">
              Удаление заявки приведет к потере всей связанной с ней информации, включая сообщения и историю обработки.
            </Typography>
          </Box>
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

      {/* Диалог закрытия заявки с сообщением */}
      <Dialog 
        open={closeWithMessageDialogOpen} 
        onClose={() => setCloseWithMessageDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ 
          pb: 1, 
          display: 'flex', 
          alignItems: 'center', 
          color: 'success.main' 
        }}>
          <CheckCircleIcon sx={{ mr: 1 }} />
          Закрытие заявки с сообщением
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Пожалуйста, введите сообщение о результатах выполнения заявки.
          </DialogContentText>
          <Box sx={{ 
            p: 2, 
            mb: 2, 
            bgcolor: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(46, 125, 50, 0.2)' 
              : 'success.light', 
            color: (theme) => theme.palette.mode === 'dark'
              ? theme.palette.success.light
              : theme.palette.success.dark,
            borderRadius: 2,
            fontSize: '0.875rem'
          }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Ваше сообщение будет добавлено к заявке и видно заявителю. Опишите, что было сделано для решения проблемы.
            </Typography>
          </Box>
          <TextField
            autoFocus
            margin="dense"
            label="Сообщение о выполнении"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={closeMessage}
            onChange={(e) => setCloseMessage(e.target.value)}
            placeholder="Например: Проблема решена. Заменил расходные материалы и произвел настройку оборудования."
            sx={{ 
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={() => setCloseWithMessageDialogOpen(false)} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleCloseTicketWithMessage} 
            color="success" 
            variant="contained"
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 10px rgba(102, 187, 106, 0.3)'
            }}
          >
            Закрыть заявку
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