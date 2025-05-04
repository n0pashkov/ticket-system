import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Typography, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Button, IconButton, TextField, 
  Dialog, DialogActions, DialogContent, DialogTitle, Box, 
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert,
  Grid, InputAdornment, Checkbox, Toolbar, Tooltip, alpha
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Add as AddIcon, 
  Search as SearchIcon,
  BlockOutlined as BlockIcon,
  CheckCircleOutline as ActivateIcon,
  ClearAll as ClearSelectionIcon
} from '@mui/icons-material';
import { usersAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const ManageUsersPage = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Состояние фильтров
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Состояние для диалогов
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Состояние для массовых операций
  const [selected, setSelected] = useState([]);
  const [openMassDeleteDialog, setOpenMassDeleteDialog] = useState(false);
  const [openMassActivateDialog, setOpenMassActivateDialog] = useState(false);
  const [openMassDeactivateDialog, setOpenMassDeactivateDialog] = useState(false);
  
  // Состояние для новых данных пользователя
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'user',
    is_active: true
  });
  
  // Состояние для оповещений
  const [alert, setAlert] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Загрузка списка пользователей
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data);
      setFilteredUsers(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Ошибка при загрузке пользователей:', err);
      setError('Не удалось загрузить список пользователей');
      setLoading(false);
    }
  }, []);
  
  // Применение фильтров
  useEffect(() => {
    let result = users;
    
    // Фильтр по поисковому запросу
    if (searchTerm) {
      result = result.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Фильтр по роли
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }
    
    // Фильтр по статусу активности
    if (activeFilter !== 'all') {
      const isActive = activeFilter === 'active';
      result = result.filter(user => user.is_active === isActive);
    }
    
    setFilteredUsers(result);
  }, [users, searchTerm, roleFilter, activeFilter]);
  
  // Инициализация
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  // Обработчики для диалогов
  const handleAddDialogOpen = () => {
    setNewUser({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'user',
      is_active: true
    });
    setOpenAddDialog(true);
  };
  
  const handleAddDialogClose = () => {
    setOpenAddDialog(false);
  };
  
  const handleEditDialogOpen = (user) => {
    setCurrentUser(user);
    setOpenEditDialog(true);
  };
  
  const handleEditDialogClose = () => {
    setOpenEditDialog(false);
  };
  
  const handleDeleteDialogOpen = (user) => {
    setCurrentUser(user);
    setOpenDeleteDialog(true);
  };
  
  const handleDeleteDialogClose = () => {
    setOpenDeleteDialog(false);
  };
  
  // Обработка создания пользователя
  const handleCreateUser = async () => {
    try {
      await usersAPI.create(newUser);
      setAlert({
        open: true,
        message: 'Пользователь успешно создан',
        severity: 'success'
      });
      handleAddDialogClose();
      fetchUsers();
    } catch (err) {
      console.error('Ошибка при создании пользователя:', err);
      setAlert({
        open: true,
        message: `Ошибка при создании пользователя: ${err.response?.data?.detail || err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Обработка обновления пользователя
  const handleUpdateUser = async () => {
    try {
      // Отправляем только измененные поля
      const updatedFields = Object.fromEntries(
        Object.entries(currentUser).filter(([key, value]) => value !== '')
      );
      
      await usersAPI.update(currentUser.id, updatedFields);
      setAlert({
        open: true,
        message: 'Данные пользователя успешно обновлены',
        severity: 'success'
      });
      handleEditDialogClose();
      fetchUsers();
    } catch (err) {
      console.error('Ошибка при обновлении пользователя:', err);
      setAlert({
        open: true,
        message: `Ошибка при обновлении пользователя: ${err.response?.data?.detail || err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Обработка удаления пользователя
  const handleDeleteUser = async () => {
    try {
      await usersAPI.delete(currentUser.id);
      setAlert({
        open: true,
        message: 'Пользователь успешно удален',
        severity: 'success'
      });
      handleDeleteDialogClose();
      fetchUsers();
    } catch (err) {
      console.error('Ошибка при удалении пользователя:', err);
      setAlert({
        open: true,
        message: `Ошибка при удалении пользователя: ${err.response?.data?.detail || err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Обработка закрытия оповещения
  const handleAlertClose = () => {
    setAlert(prev => ({ ...prev, open: false }));
  };
  
  // Обновление полей нового пользователя
  const handleNewUserChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };
  
  // Обновление полей существующего пользователя
  const handleCurrentUserChange = (e) => {
    const { name, value } = e.target;
    setCurrentUser(prev => ({ ...prev, [name]: value }));
  };
  
  // Проверка, является ли текущий пользователь тем же, что и аутентифицированный
  const isSameUser = (userId) => {
    return user && user.id === userId;
  };
  
  // Обработчики выбора пользователей
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = filteredUsers.map((user) => user.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleSelectClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(userId => userId !== id);
    }

    setSelected(newSelected);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;
  
  // Обработчики диалогов для массовых действий
  const handleMassDeleteDialogOpen = () => {
    setOpenMassDeleteDialog(true);
  };

  const handleMassDeleteDialogClose = () => {
    setOpenMassDeleteDialog(false);
  };

  const handleMassActivateDialogOpen = () => {
    setOpenMassActivateDialog(true);
  };

  const handleMassActivateDialogClose = () => {
    setOpenMassActivateDialog(false);
  };

  const handleMassDeactivateDialogOpen = () => {
    setOpenMassDeactivateDialog(true);
  };

  const handleMassDeactivateDialogClose = () => {
    setOpenMassDeactivateDialog(false);
  };
  
  // Массовое удаление пользователей
  const handleMassDelete = async () => {
    try {
      // Фильтруем выбранных пользователей, исключая текущего пользователя
      const usersToDelete = selected.filter(id => user && user.id !== id);
      
      // Создаем массив промисов для удаления
      const deletePromises = usersToDelete.map(id => usersAPI.delete(id));
      
      // Выполняем все запросы параллельно
      await Promise.all(deletePromises);
      
      setAlert({
        open: true,
        message: `Успешно удалено ${usersToDelete.length} пользователей`,
        severity: 'success'
      });
      
      // Если попытались удалить себя, показываем предупреждение
      if (usersToDelete.length < selected.length) {
        setAlert({
          open: true,
          message: 'Собственный аккаунт не может быть удален',
          severity: 'warning'
        });
      }
      
      handleMassDeleteDialogClose();
      setSelected([]);
      fetchUsers();
    } catch (err) {
      console.error('Ошибка при массовом удалении пользователей:', err);
      setAlert({
        open: true,
        message: `Ошибка при удалении пользователей: ${err.response?.data?.detail || err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Массовая активация пользователей
  const handleMassActivate = async () => {
    try {
      // Создаем массив промисов для активации
      const activatePromises = selected.map(id => 
        usersAPI.update(id, { is_active: true })
      );
      
      // Выполняем все запросы параллельно
      await Promise.all(activatePromises);
      
      setAlert({
        open: true,
        message: `Успешно активировано ${selected.length} пользователей`,
        severity: 'success'
      });
      
      handleMassActivateDialogClose();
      setSelected([]);
      fetchUsers();
    } catch (err) {
      console.error('Ошибка при массовой активации пользователей:', err);
      setAlert({
        open: true,
        message: `Ошибка при активации пользователей: ${err.response?.data?.detail || err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Массовая деактивация пользователей
  const handleMassDeactivate = async () => {
    try {
      // Фильтруем выбранных пользователей, исключая текущего пользователя
      const usersToDeactivate = selected.filter(id => user && user.id !== id);
      
      // Создаем массив промисов для деактивации
      const deactivatePromises = usersToDeactivate.map(id => 
        usersAPI.update(id, { is_active: false })
      );
      
      // Выполняем все запросы параллельно
      await Promise.all(deactivatePromises);
      
      setAlert({
        open: true,
        message: `Успешно деактивировано ${usersToDeactivate.length} пользователей`,
        severity: 'success'
      });
      
      // Если попытались деактивировать себя, показываем предупреждение
      if (usersToDeactivate.length < selected.length) {
        setAlert({
          open: true,
          message: 'Собственный аккаунт не может быть деактивирован',
          severity: 'warning'
        });
      }
      
      handleMassDeactivateDialogClose();
      setSelected([]);
      fetchUsers();
    } catch (err) {
      console.error('Ошибка при массовой деактивации пользователей:', err);
      setAlert({
        open: true,
        message: `Ошибка при деактивации пользователей: ${err.response?.data?.detail || err.message}`,
        severity: 'error'
      });
    }
  };
  
  // Если пользователь не админ, запрещаем доступ
  if (user && user.role !== 'admin') {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">
          У вас нет прав для доступа к этой странице. Только администраторы могут управлять пользователями.
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Фильтры и кнопка добавления */}
      <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <TextField
            fullWidth
            label="Поиск пользователей"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel>Роль</InputLabel>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              label="Роль"
            >
              <MenuItem value="all">Все роли</MenuItem>
              <MenuItem value="admin">Администратор</MenuItem>
              <MenuItem value="agent">Агент</MenuItem>
              <MenuItem value="user">Пользователь</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel>Статус</InputLabel>
            <Select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              label="Статус"
            >
              <MenuItem value="all">Все статусы</MenuItem>
              <MenuItem value="active">Активные</MenuItem>
              <MenuItem value="inactive">Неактивные</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddDialogOpen}
          >
            Добавить пользователя
          </Button>
        </Grid>
      </Grid>
      
      {/* Панель массовых действий */}
      {selected.length > 0 && (
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            mb: 2,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            borderRadius: 1,
          }}
        >
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            Выбрано: {selected.length}
          </Typography>
          
          <Tooltip title="Снять выделение">
            <IconButton onClick={() => setSelected([])}>
              <ClearSelectionIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Активировать выбранных">
            <IconButton onClick={handleMassActivateDialogOpen}>
              <ActivateIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Деактивировать выбранных">
            <IconButton onClick={handleMassDeactivateDialogOpen}>
              <BlockIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Удалить выбранных">
            <IconButton onClick={handleMassDeleteDialogOpen} color="error">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      )}
      
      {/* Таблица пользователей */}
      {loading ? (
        <Typography>Загрузка данных...</Typography>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    indeterminate={selected.length > 0 && selected.length < filteredUsers.length}
                    checked={filteredUsers.length > 0 && selected.length === filteredUsers.length}
                    onChange={handleSelectAllClick}
                    inputProps={{
                      'aria-label': 'выбрать всех пользователей',
                    }}
                  />
                </TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Имя пользователя</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Полное имя</TableCell>
                <TableCell>Роль</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isItemSelected = isSelected(user.id);
                  return (
                    <TableRow 
                      key={user.id}
                      hover
                      onClick={(event) => handleSelectClick(event, user.id)}
                      role="checkbox"
                      aria-checked={isItemSelected}
                      selected={isItemSelected}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          inputProps={{
                            'aria-labelledby': `enhanced-table-checkbox-${user.id}`,
                          }}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => handleSelectClick(event, user.id)}
                        />
                      </TableCell>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name || '—'}</TableCell>
                      <TableCell>
                        {user.role === 'admin' && 'Администратор'}
                        {user.role === 'agent' && 'Агент'}
                        {user.role === 'user' && 'Пользователь'}
                      </TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Box sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            bgcolor: 'success.light', 
                            color: 'success.contrastText',
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1,
                            fontSize: '0.875rem'
                          }}>
                            Активный
                          </Box>
                        ) : (
                          <Box sx={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            bgcolor: 'error.light', 
                            color: 'error.contrastText',
                            px: 1, 
                            py: 0.5, 
                            borderRadius: 1,
                            fontSize: '0.875rem'
                          }}>
                            Неактивный
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          color="primary" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDialogOpen(user);
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton 
                          color="error" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDialogOpen(user);
                          }}
                          disabled={isSameUser(user.id)} // Нельзя удалить самого себя
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    Пользователи не найдены
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Диалог добавления пользователя */}
      <Dialog open={openAddDialog} onClose={handleAddDialogClose}>
        <DialogTitle>Добавить нового пользователя</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, width: '400px', maxWidth: '100%' }}>
            <TextField
              fullWidth
              margin="normal"
              label="Имя пользователя"
              name="username"
              value={newUser.username}
              onChange={handleNewUserChange}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Email (опционально)"
              name="email"
              type="email"
              value={newUser.email}
              onChange={handleNewUserChange}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Полное имя"
              name="full_name"
              value={newUser.full_name}
              onChange={handleNewUserChange}
            />
            <TextField
              fullWidth
              margin="normal"
              label="Пароль"
              name="password"
              type="password"
              value={newUser.password}
              onChange={handleNewUserChange}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Роль</InputLabel>
              <Select
                name="role"
                value={newUser.role}
                onChange={handleNewUserChange}
                label="Роль"
              >
                <MenuItem value="admin">Администратор</MenuItem>
                <MenuItem value="agent">Агент</MenuItem>
                <MenuItem value="user">Пользователь</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Статус активности</InputLabel>
              <Select
                name="is_active"
                value={newUser.is_active}
                onChange={handleNewUserChange}
                label="Статус активности"
              >
                <MenuItem value={true}>Активный</MenuItem>
                <MenuItem value={false}>Неактивный</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDialogClose} color="primary">
            Отмена
          </Button>
          <Button 
            onClick={handleCreateUser} 
            color="primary" 
            variant="contained"
            disabled={!newUser.username || !newUser.password}
          >
            Создать
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог редактирования пользователя */}
      <Dialog open={openEditDialog} onClose={handleEditDialogClose}>
        <DialogTitle>Изменить данные пользователя</DialogTitle>
        <DialogContent>
          {currentUser && (
            <Box sx={{ pt: 1, width: '400px', maxWidth: '100%' }}>
              <TextField
                fullWidth
                margin="normal"
                label="Имя пользователя"
                name="username"
                value={currentUser.username || ''}
                onChange={handleCurrentUserChange}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Email (опционально)"
                name="email"
                type="email"
                value={currentUser.email || ''}
                onChange={handleCurrentUserChange}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Полное имя"
                name="full_name"
                value={currentUser.full_name || ''}
                onChange={handleCurrentUserChange}
              />
              <TextField
                fullWidth
                margin="normal"
                label="Новый пароль"
                name="password"
                type="password"
                value={currentUser.password || ''}
                onChange={handleCurrentUserChange}
                helperText="Оставьте пустым, если не хотите менять пароль"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Роль</InputLabel>
                <Select
                  name="role"
                  value={currentUser.role || ''}
                  onChange={handleCurrentUserChange}
                  label="Роль"
                  disabled={isSameUser(currentUser.id)} // Нельзя изменить свою роль
                >
                  <MenuItem value="admin">Администратор</MenuItem>
                  <MenuItem value="agent">Агент</MenuItem>
                  <MenuItem value="user">Пользователь</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Статус активности</InputLabel>
                <Select
                  name="is_active"
                  value={typeof currentUser.is_active === 'boolean' ? currentUser.is_active : true}
                  onChange={handleCurrentUserChange}
                  label="Статус активности"
                  disabled={isSameUser(currentUser.id)} // Нельзя деактивировать самого себя
                >
                  <MenuItem value={true}>Активный</MenuItem>
                  <MenuItem value={false}>Неактивный</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose} color="primary">
            Отмена
          </Button>
          <Button 
            onClick={handleUpdateUser} 
            color="primary" 
            variant="contained"
          >
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог удаления пользователя */}
      <Dialog open={openDeleteDialog} onClose={handleDeleteDialogClose}>
        <DialogTitle>Удаление пользователя</DialogTitle>
        <DialogContent>
          {currentUser && (
            <Typography>
              Вы действительно хотите удалить пользователя <strong>{currentUser.username}</strong>?
              Это действие нельзя отменить.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} color="primary">
            Отмена
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            color="error" 
            variant="contained"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог массового удаления пользователей */}
      <Dialog open={openMassDeleteDialog} onClose={handleMassDeleteDialogClose}>
        <DialogTitle>Массовое удаление пользователей</DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите удалить {selected.length} выбранных пользователей?
            Если среди выбранных пользователей есть ваш аккаунт, он не будет удален.
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMassDeleteDialogClose} color="primary">
            Отмена
          </Button>
          <Button 
            onClick={handleMassDelete} 
            color="error" 
            variant="contained"
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог массовой активации пользователей */}
      <Dialog open={openMassActivateDialog} onClose={handleMassActivateDialogClose}>
        <DialogTitle>Массовая активация пользователей</DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите активировать {selected.length} выбранных пользователей?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMassActivateDialogClose} color="primary">
            Отмена
          </Button>
          <Button 
            onClick={handleMassActivate} 
            color="primary" 
            variant="contained"
          >
            Активировать
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Диалог массовой деактивации пользователей */}
      <Dialog open={openMassDeactivateDialog} onClose={handleMassDeactivateDialogClose}>
        <DialogTitle>Массовая деактивация пользователей</DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите деактивировать {selected.length} выбранных пользователей?
            Если среди выбранных пользователей есть ваш аккаунт, он не будет деактивирован.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMassDeactivateDialogClose} color="primary">
            Отмена
          </Button>
          <Button 
            onClick={handleMassDeactivate} 
            color="error" 
            variant="contained"
          >
            Деактивировать
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Оповещения */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={handleAlertClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleAlertClose} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ManageUsersPage; 