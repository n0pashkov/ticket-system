import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Button, Chip,
  CircularProgress, TextField, InputAdornment, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  MenuItem, Select, FormControl, InputLabel, Grid,
  TablePagination, Alert, Tooltip, Snackbar
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import DoneIcon from '@mui/icons-material/Done';
import { useTickets } from '../hooks/useTickets';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  'new': 'warning',
  'in_progress': 'info',
  'closed': 'success'
};

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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {getErrorMessage()}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Заявки
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => navigate('/tickets/new')}
        >
          Создать заявку
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Поиск заявок"
              variant="outlined"
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Статус</InputLabel>
              <Select
                value={filterStatus}
                onChange={handleStatusFilterChange}
                label="Статус"
              >
                <MenuItem value="all">Все статусы</MenuItem>
                <MenuItem value="new">Новые</MenuItem>
                <MenuItem value="in_progress">В работе</MenuItem>
                <MenuItem value="closed">Закрытые</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Приоритет</InputLabel>
              <Select
                value={filterPriority}
                onChange={handlePriorityFilterChange}
                label="Приоритет"
              >
                <MenuItem value="all">Все приоритеты</MenuItem>
                <MenuItem value="low">Низкий</MenuItem>
                <MenuItem value="medium">Средний</MenuItem>
                <MenuItem value="high">Высокий</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tickets Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {isAdmin && <TableCell>ID</TableCell>}
              <TableCell>Заголовок</TableCell>
              <TableCell>Кабинет</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Приоритет</TableCell>
              <TableCell>Исполнитель</TableCell>
              <TableCell>Создана</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTickets.length > 0 ? (
              paginatedTickets.map((ticket) => (
                <TableRow 
                  key={ticket.id} 
                  onClick={() => handleRowClick(ticket.id)}
                  hover
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                  }}
                >
                  {isAdmin && <TableCell>{ticket.id}</TableCell>}
                  <TableCell>{ticket.title}</TableCell>
                  <TableCell>{ticket.room_number || "—"}</TableCell>
                  <TableCell>
                    <Chip 
                      label={formatStatus(ticket.status)}
                      color={statusColors[ticket.status] || 'default'} 
                      size="small" 
                      onClick={(e) => e.stopPropagation()} // Предотвращаем срабатывание клика по строке
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={formatPriority(ticket.priority)}
                      color={priorityColors[ticket.priority] || 'default'} 
                      size="small" 
                      onClick={(e) => e.stopPropagation()} // Предотвращаем срабатывание клика по строке
                    />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}> {/* Предотвращаем срабатывание клика по строке */}
                    {ticket.assigned_to_id ? (
                      <Chip
                        icon={<AssignmentIndIcon />}
                        label={getAssigneeName(ticket.assigned_to_id)}
                        color="info"
                        size="small"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Не назначен
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 7 : 6} align="center">
                  Заявки не найдены.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredTickets.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Строк на странице:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} из ${count}`}
        />
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          {deleteError ? (
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {deleteError}
            </Alert>
          ) : (
            <Typography>
              {user && user.role === 'admin' ? (
                `Вы уверены, что хотите удалить заявку "${ticketToDelete?.title}"? Это действие нельзя отменить.`
              ) : (
                `Вы уверены, что хотите скрыть заявку "${ticketToDelete?.title}"? Вы больше не будете её видеть, но администраторы и технические специалисты по-прежнему будут иметь к ней доступ.`
              )}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}>Отмена</Button>
          <Button 
            onClick={confirmDelete} 
            color="error"
            disabled={!!deleteError}
          >
            {user && user.role === 'admin' ? 'Удалить' : 'Скрыть'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
};

export default TicketsPage; 