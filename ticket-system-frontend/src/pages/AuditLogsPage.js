import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, Chip, useTheme, TextField, 
  FormControl, InputLabel, Select, MenuItem, Button, Grid, Card,
  CardContent, IconButton, Tooltip, Avatar, Alert, CircularProgress
} from '@mui/material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import InfoIcon from '@mui/icons-material/Info';
import ClearIcon from '@mui/icons-material/Clear';
import { auditAPI } from '../api/api';
import { usersAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

const AuditLogsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({
    action_type: '',
    entity_type: '',
    user_id: '',
    from_date: '',
    to_date: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const theme = useTheme();

  // Проверка прав доступа
  useEffect(() => {
    if (user && user.role !== 'admin') {
      // Если пользователь не администратор, перенаправляем на главную
      navigate('/');
    }
  }, [user, navigate]);

  // Загрузка списка пользователей для фильтра
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await usersAPI.getAll();
        setUsers(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (showFilters) {
      fetchUsers();
    }
  }, [showFilters]);

  // Получение журнала аудита
  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Подготавливаем параметры, удаляя пустые значения
      const cleanFilters = { ...filters };
      Object.keys(cleanFilters).forEach(key => {
        if (cleanFilters[key] === undefined || cleanFilters[key] === '') {
          delete cleanFilters[key];
        }
        // Форматируем даты в ISO-формат для бэкенда
        else if ((key === 'from_date' || key === 'to_date') && cleanFilters[key]) {
          if (isValidDate(cleanFilters[key])) {
            // Преобразуем локальную дату в ISO-формат
            cleanFilters[key] = new Date(cleanFilters[key]).toISOString().split('T')[0];
          } else {
            // Если дата невалидна, удаляем ее из фильтров
            delete cleanFilters[key];
          }
        }
        // Убеждаемся, что user_id передается как число
        else if (key === 'user_id' && cleanFilters[key]) {
          const userId = parseInt(cleanFilters[key], 10);
          if (isNaN(userId)) {
            delete cleanFilters[key];
          } else {
            cleanFilters[key] = userId;
          }
        }
      });
      
      console.log('Отправляем запрос в API с параметрами:', cleanFilters);
      
      const requestParams = {
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        ...cleanFilters
      };
      
      console.log('Финальные параметры запроса:', requestParams);
      
      const response = await auditAPI.getAll(requestParams);
      
      console.log('Получен ответ от API:', response);
      console.log('Заголовки ответа:', response.headers);
      console.log('Данные ответа:', response.data);
      
      if (Array.isArray(response.data)) {
        setLogs(response.data);
        
        // Получаем общее количество записей для пагинации
        const totalCountHeader = response.headers['x-total-count'];
        setTotalCount(totalCountHeader ? parseInt(totalCountHeader, 10) : response.data.length);
        
        setLoading(false);
      } else {
        console.error('Неверный формат данных, ожидался массив:', response.data);
        setError('Получены данные в неверном формате. Обратитесь к администратору.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Ошибка при получении журнала аудита:', error);
      
      let errorMessage = 'Произошла ошибка при загрузке данных журнала аудита.';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage += ' Превышено время ожидания ответа от сервера (таймаут).';
      } else if (error.response) {
        if (error.response.status === 403) {
          errorMessage += ' У вас недостаточно прав доступа.';
        } else if (error.response.status === 401) {
          errorMessage += ' Требуется авторизация.';
        } else {
          errorMessage += ` Код ошибки: ${error.response.status}.`;
        }
      } else if (error.request) {
        errorMessage += ' Сервер не отвечает. Проверьте подключение.';
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, rowsPerPage, filters]);

  // Обработчики изменения страницы и строк на странице
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Обработчик изменения фильтров
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Сброс фильтров
  const resetFilters = () => {
    setFilters({
      action_type: '',
      entity_type: '',
      user_id: '',
      from_date: '',
      to_date: ''
    });
    setPage(0);
  };

  // Функция для получения цвета чипа в зависимости от типа действия
  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'warning';
      case 'DELETE':
        return 'error';
      case 'LOGIN':
        return 'info';
      case 'LOGOUT':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Функция для экспорта данных в CSV
  const exportToCSV = () => {
    if (logs.length === 0) return;

    // Формируем заголовки CSV
    let csvContent = "ID,Пользователь,Действие,Описание,Тип сущности,ID сущности,IP-адрес,Дата и время\n";
    
    // Добавляем данные
    logs.forEach(log => {
      const row = [
        log.id,
        log.user ? log.user.username : 'Система',
        log.action_type,
        log.description,
        log.entity_type || '',
        log.entity_id || '',
        log.ip_address || '',
        format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss')
      ];
      
      // Экранируем запятые и кавычки
      const csvRow = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        const cellStr = String(cell);
        return cellStr.includes(',') ? `"${cellStr.replace(/"/g, '""')}"` : cellStr;
      }).join(',');
      
      csvContent += csvRow + "\n";
    });
    
    // Создаем и скачиваем файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'audit_logs.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Добавляем дополнительные проверки на валидность даты
  const isValidDate = (dateStr) => {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  return (
    <Box>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          Журнал аудита действий пользователей
        </Typography>
        
        <Box>
          <Tooltip title="Обновить данные">
            <IconButton onClick={fetchAuditLogs} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Показать/скрыть фильтры">
            <IconButton 
              onClick={() => setShowFilters(!showFilters)} 
              color={showFilters ? "primary" : "default"}
            >
              <FilterListIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Экспорт в CSV">
            <IconButton 
              onClick={exportToCSV} 
              color="primary" 
              disabled={logs.length === 0}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Фильтры */}
      {showFilters && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Фильтры
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Тип действия</InputLabel>
                  <Select
                    name="action_type"
                    value={filters.action_type}
                    onChange={handleFilterChange}
                    label="Тип действия"
                  >
                    <MenuItem value="">Все</MenuItem>
                    <MenuItem value="CREATE">Создание</MenuItem>
                    <MenuItem value="UPDATE">Обновление</MenuItem>
                    <MenuItem value="DELETE">Удаление</MenuItem>
                    <MenuItem value="LOGIN">Вход в систему</MenuItem>
                    <MenuItem value="LOGOUT">Выход из системы</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Тип сущности</InputLabel>
                  <Select
                    name="entity_type"
                    value={filters.entity_type}
                    onChange={handleFilterChange}
                    label="Тип сущности"
                  >
                    <MenuItem value="">Все</MenuItem>
                    <MenuItem value="user">Пользователь</MenuItem>
                    <MenuItem value="ticket">Заявка</MenuItem>
                    <MenuItem value="equipment">Оборудование</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Пользователь</InputLabel>
                  <Select
                    name="user_id"
                    value={filters.user_id}
                    onChange={handleFilterChange}
                    label="Пользователь"
                    disabled={loadingUsers}
                  >
                    <MenuItem value="">Все</MenuItem>
                    {users.map(user => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.username} {user.full_name && `(${user.full_name})`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="С даты"
                  type="date"
                  name="from_date"
                  value={filters.from_date}
                  onChange={handleFilterChange}
                  InputLabelProps={{ shrink: true }}
                  // Добавляем дополнительные проверки на валидность даты
                  helperText={filters.from_date && !isValidDate(filters.from_date) ? 
                    "Неверный формат даты" : ""}
                  error={filters.from_date && !isValidDate(filters.from_date)}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="По дату"
                  type="date"
                  name="to_date"
                  value={filters.to_date}
                  onChange={handleFilterChange}
                  InputLabelProps={{ shrink: true }}
                  // Добавляем дополнительные проверки на валидность даты
                  helperText={filters.to_date && !isValidDate(filters.to_date) ? 
                    "Неверный формат даты" : ""}
                  error={filters.to_date && !isValidDate(filters.to_date)}
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                onClick={resetFilters} 
                sx={{ mr: 1 }}
              >
                Сбросить
              </Button>
              <Button 
                variant="contained" 
                onClick={() => { setPage(0); fetchAuditLogs(); }}
              >
                Применить
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {/* Индикатор загрузки */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {/* Отображение ошибки */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Таблица логов */}
      {!loading && logs.length > 0 ? (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }} size="small">
              <TableHead>
                <TableRow 
                  sx={{ 
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? 'rgba(255, 255, 255, 0.05)' 
                      : 'rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <TableCell width="5%">#</TableCell>
                  <TableCell width="15%">Пользователь</TableCell>
                  <TableCell width="10%">Действие</TableCell>
                  <TableCell width="25%">Описание</TableCell>
                  <TableCell width="15%">Сущность</TableCell>
                  <TableCell width="10%">IP-адрес</TableCell>
                  <TableCell width="15%">Дата и время</TableCell>
                  <TableCell width="5%">Детали</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>{log.id}</TableCell>
                    <TableCell>
                      {log.user ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            sx={{ 
                              width: 24, 
                              height: 24, 
                              fontSize: '0.75rem',
                              mr: 1
                            }}
                          >
                            {log.user.username.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2">
                            {log.user.username}
                          </Typography>
                        </Box>
                      ) : 'Система'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={log.action_type} 
                        size="small" 
                        color={getActionColor(log.action_type)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {log.entity_type && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {log.entity_type}
                          </Typography>
                          {log.entity_id && (
                            <Typography variant="body2">
                              ID: {log.entity_id}
                            </Typography>
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.ip_address || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {log.created_at && (
                        <Typography variant="body2">
                          {format(new Date(log.created_at), 'dd MMM yyyy', { locale: ru })}
                          <br />
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Просмотреть детали">
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Строк на странице:"
            labelDisplayedRows={({ from, to, count }) => 
              `${from}-${to} из ${count !== -1 ? count : `более чем ${to}`}`
            }
          />
        </>
      ) : !loading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Записи не найдены. Измените параметры фильтрации или добавьте новые действия в систему.
        </Alert>
      )}
    </Box>
  );
};

export default AuditLogsPage; 