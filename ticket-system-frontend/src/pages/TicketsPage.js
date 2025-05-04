import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Chip,
  CircularProgress, TextField, InputAdornment, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel,
  TablePagination, Alert, Tooltip, Snackbar,
  Card, CardContent, Avatar, Divider, Paper, Badge
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import DoneIcon from '@mui/icons-material/Done';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MessageIcon from '@mui/icons-material/Message';
import { useTickets } from '../hooks/useTickets';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../context/AuthContext';
import { ticketsAPI } from '../api/api';

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

const TicketsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Получаем информацию о текущем пользователе
  const { users, getUserById } = useUsers(); // Получаем список пользователей и функцию получения пользователя по ID
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Возможные ошибки при удалении
  const [deleteError, setDeleteError] = useState(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [ticketMessages, setTicketMessages] = useState({});

  // Получаем тикеты с применением серверной фильтрации по статусу
  const apiFilters = {};
  if (filterStatus !== 'all') {
    apiFilters.status = filterStatus;
  }

  const { 
    tickets, 
    isLoading, 
    isError, 
    error,
    deleteTicket,
    selfAssignTicket,
    closeTicket
  } = useTickets(apiFilters);

  // Загрузка информации о сообщениях для каждого тикета
  useEffect(() => {
    const loadTicketMessages = async () => {
      if (!tickets || tickets.length === 0) return;
      
      const messagesInfo = {};
      
      // Создаем массив промисов для получения количества сообщений для каждого тикета
      const promises = tickets.map(ticket => 
        ticketsAPI.getMessages(ticket.id)
          .then(response => {
            messagesInfo[ticket.id] = response.data.length;
          })
          .catch(error => {
            console.error(`Ошибка при получении сообщений для тикета ${ticket.id}:`, error);
            messagesInfo[ticket.id] = 0;
          })
      );
      
      // Ждем выполнения всех запросов
      await Promise.all(promises);
      setTicketMessages(messagesInfo);
    };
    
    loadTicketMessages();
  }, [tickets]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(0);
  };

  const handleStatusFilterChange = (e) => {
    setFilterStatus(e.target.value);
    setPage(0);
  };

  const handlePriorityFilterChange = (e) => {
    setFilterPriority(e.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openDeleteDialog = (ticket) => {
    setTicketToDelete(ticket);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setTicketToDelete(null);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (ticketToDelete) {
      try {
        setDeleteError(null);
        await deleteTicket(ticketToDelete.id);
        closeDeleteDialog();
        // Показываем уведомление об успешном удалении/скрытии
        setSnackbar({
          open: true,
          message: user && user.role === 'admin' 
                   ? 'Заявка успешно удалена' 
                   : 'Заявка успешно скрыта',
          severity: 'success'
        });
      } catch (err) {
        console.error('Error during ticket deletion:', err);
        setDeleteError('Ошибка при удалении заявки. Пожалуйста, попробуйте позже.');
      }
    }
  };

  // Получение сообщения об ошибке
  const getErrorMessage = () => {
    if (error?.response?.data?.detail) {
      if (typeof error.response.data.detail === 'string') {
        return error.response.data.detail;
      }
    }
    return 'Ошибка загрузки тикетов. Пожалуйста, попробуйте позже.';
  };

  // Клиентская фильтрация (для поиска и фильтрации по приоритету)
  const filteredTickets = !tickets ? [] : tickets.filter(ticket => {
    // Search filter
    const matchesSearch = 
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Priority filter
    const matchesPriority = filterPriority === 'all' || ticket.priority === filterPriority;
    
    return matchesSearch && matchesPriority;
  });

  // Apply pagination
  const paginatedTickets = filteredTickets.slice(
    page * rowsPerPage, 
    page * rowsPerPage + rowsPerPage
  );

  // Проверка, является ли пользователь агентом или администратором
  const isAgentOrAdmin = user && ['agent', 'admin'].includes(user.role);
  
  // Проверка, является ли пользователь администратором
  const isAdmin = user && user.role === 'admin';

  // Обработчик взятия заявки в работу
  const handleSelfAssign = async (ticketId, event) => {
    event.stopPropagation(); // Предотвращаем навигацию на страницу заявки
    try {
      await selfAssignTicket(ticketId);
      setSnackbar({
        open: true,
        message: 'Заявка успешно взята в работу',
        severity: 'success'
      });
    } catch (error) {
      console.error('Ошибка при взятии заявки в работу:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при взятии заявки в работу',
        severity: 'error'
      });
    }
  };

  // Обработчик закрытия заявки
  const handleCloseTicket = async (ticketId, event) => {
    event.stopPropagation(); // Предотвращаем навигацию на страницу заявки
    try {
      await closeTicket(ticketId);
      setSnackbar({
        open: true,
        message: 'Заявка успешно отмечена как выполненная',
        severity: 'success'
      });
    } catch (error) {
      console.error('Ошибка при закрытии заявки:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при закрытии заявки',
        severity: 'error'
      });
    }
  };

  // Закрытие уведомления
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Получение полного имени исполнителя по ID
  const getAssigneeName = (assignedToId) => {
    if (!assignedToId) return null;
    const assignee = getUserById(assignedToId);
    return assignee?.full_name || "Назначен";
  };

  // Обработчик клика по строке таблицы - переход на страницу детальной информации
  const handleRowClick = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
  };

  const handleCreateTicket = () => {
    navigate('/tickets/new');
  };

  const handleGoBack = () => {
    navigate('/');
  };

  // Функция для отображения сообщений тикета
  const hasMessages = (ticketId) => {
    return ticketMessages[ticketId] > 0;
  };

  if (isLoading) {
    return (
      <Box sx={{ 
        width: '100%', 
        maxWidth: '100vw', 
        p: 2,
        display: 'flex', 
        justifyContent: 'center', 
        mt: 4 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {getErrorMessage()}
        </Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleGoBack}
          sx={{ borderRadius: 2 }}
        >
          Вернуться на главную
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
      boxSizing: 'border-box'
    }}>
      <Box sx={{ 
        p: 2, 
        width: '100%',
        boxSizing: 'border-box' 
      }}>
        {/* Заголовок и кнопка создания заявки */}
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
              onClick={handleGoBack}
              sx={{ 
                mr: 1,
                backgroundColor: 'rgba(25, 118, 210, 0.08)'
              }}
            >
              <ArrowBackIcon />
            </IconButton>
          </Box>

          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateTicket}
            startIcon={<AddIcon />}
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
            }}
          >
            Новая заявка
          </Button>
        </Box>

        {/* Карточка фильтров */}
        <Card 
          sx={{ 
            mb: 3, 
            borderRadius: 4, 
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            width: '100%'
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
              <FilterListIcon sx={{ mr: 1, color: 'action.active' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Фильтры
              </Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              gap: 2,
              width: '100%'
            }}>
              <TextField
                placeholder="Поиск по заявкам"
                variant="outlined"
                value={searchQuery}
                onChange={handleSearch}
                fullWidth
                size="small"
                sx={{ 
                  mb: { xs: 2, sm: 0 },
                  '& .MuiOutlinedInput-root': { borderRadius: 2 }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              
              <FormControl 
                variant="outlined" 
                size="small" 
                sx={{ minWidth: { xs: '100%', sm: 180 } }}
              >
                <InputLabel>Статус</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={handleStatusFilterChange}
                  label="Статус"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">Все статусы</MenuItem>
                  <MenuItem value="new">Новые</MenuItem>
                  <MenuItem value="in_progress">В работе</MenuItem>
                  <MenuItem value="closed">Закрытые</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl 
                variant="outlined" 
                size="small" 
                sx={{ minWidth: { xs: '100%', sm: 180 } }}
              >
                <InputLabel>Приоритет</InputLabel>
                <Select
                  value={filterPriority}
                  onChange={handlePriorityFilterChange}
                  label="Приоритет"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="all">Все приоритеты</MenuItem>
                  <MenuItem value="low">Низкий</MenuItem>
                  <MenuItem value="medium">Средний</MenuItem>
                  <MenuItem value="high">Высокий</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
        </Card>

        {/* Таблица заявок */}
        <Card 
          sx={{ 
            borderRadius: 4, 
            overflow: 'hidden',
            width: '100%',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          }}
        >
          <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ backgroundColor: 'primary.main' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Название</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Статус</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Приоритет</TableCell>
                  {isAgentOrAdmin && (
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Создатель</TableCell>
                  )}
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Исполнитель</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : paginatedTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      {searchQuery || filterStatus !== 'all' || filterPriority !== 'all' 
                        ? 'Заявки по заданным критериям не найдены'
                        : 'Заявки отсутствуют'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTickets.map((ticket) => (
                    <TableRow 
                      key={ticket.id}
                      onClick={() => handleRowClick(ticket.id)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography 
                            variant="body2" 
                            fontWeight={hasMessages(ticket.id) && ticket.status === 'closed' ? 'bold' : 'normal'}
                          >
                            {ticket.title}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {ticket.status === 'closed' && hasMessages(ticket.id) ? (
                          <Chip 
                            deleteIcon={<MessageIcon style={{ fontSize: '16px', color: 'white' }} />}
                            onDelete={() => {}} // Это нужно, чтобы deleteIcon отображался
                            label={formatStatus(ticket.status)}
                            size="small"
                            sx={{ 
                              bgcolor: statusColors[ticket.status],
                              color: 'white',
                              fontWeight: 500,
                              '& .MuiChip-deleteIcon': {
                                color: 'white',
                                opacity: 1,
                                '&:hover': {
                                  color: 'white',
                                  opacity: 0.8
                                }
                              }
                            }}
                          />
                        ) : (
                          <Chip 
                            label={formatStatus(ticket.status)}
                            size="small"
                            sx={{ 
                              bgcolor: statusColors[ticket.status],
                              color: 'white',
                              fontWeight: 500
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={formatPriority(ticket.priority)}
                          size="small"
                          sx={{ 
                            bgcolor: priorityColors[ticket.priority],
                            color: 'white',
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                      {isAgentOrAdmin && (
                        <TableCell>{getUserById(ticket.creator_id)?.full_name || 'Неизвестен'}</TableCell>
                      )}
                      <TableCell>
                        {ticket.assigned_to_id 
                          ? getUserById(ticket.assigned_to_id)?.full_name || 'Неизвестен'
                          : 'Не назначен'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {ticket.status === 'new' && isAgentOrAdmin && (
                            <Tooltip title="Взять в работу">
                              <IconButton 
                                size="small" 
                                color="primary"
                                onClick={(e) => handleSelfAssign(ticket.id, e)}
                                sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)' }}
                              >
                                <AssignmentIndIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {ticket.status === 'in_progress' && 
                           isAgentOrAdmin && 
                           (isAdmin || user?.id === ticket.assigned_to_id) && (
                            <Tooltip title="Отметить как выполненную">
                              <IconButton 
                                size="small" 
                                color="success"
                                onClick={(e) => handleCloseTicket(ticket.id, e)}
                                sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)' }}
                              >
                                <DoneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {isAdmin && (
                            <Tooltip title="Удалить">
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog(ticket);
                                }}
                                sx={{ backgroundColor: 'rgba(244, 67, 54, 0.1)' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredTickets.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </Box>

      {/* Диалог подтверждения удаления */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={closeDeleteDialog}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          {isAdmin ? "Удаление заявки" : "Скрытие заявки"}
        </DialogTitle>
        <DialogContent>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {deleteError}
            </Alert>
          )}
          <Typography>
            {isAdmin 
              ? "Вы уверены, что хотите удалить эту заявку? Это действие нельзя отменить."
              : "Вы уверены, что хотите скрыть эту заявку из вашего списка?"}
          </Typography>
          {ticketToDelete && (
            <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold' }}>
              "{ticketToDelete.title}"
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ pb: 3, px: 3 }}>
          <Button 
            onClick={closeDeleteDialog} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Отмена
          </Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 10px rgba(244, 67, 54, 0.3)'
            }}
          >
            {isAdmin ? "Удалить" : "Скрыть"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Уведомление */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert 
          elevation={6} 
          variant="filled" 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default TicketsPage; 