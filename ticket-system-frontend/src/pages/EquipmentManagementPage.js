import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, CircularProgress, Alert, Snackbar,
  Grid, Card, CardContent, IconButton, TextField, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  FormControl, InputLabel, Select, MenuItem, Chip, Tabs, Tab, Divider,
  Switch, FormControlLabel, Tooltip, Stepper, Step, StepLabel
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon,
  Delete as DeleteIcon, DevicesOther as DevicesIcon,
  Computer as ComputerIcon, Print as PrinterIcon,
  Monitor as MonitorIcon, Bookmark as BookmarkIcon,
  LocationOn as LocationIcon, FilterList as FilterListIcon,
  Refresh as RefreshIcon, ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon, Check as CheckIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useEquipment } from '../hooks/useEquipment';
import useCategories from '../hooks/useCategories';
import { useNavigate } from 'react-router-dom';

const EquipmentManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    equipment, 
    isLoading: equipmentLoading, 
    refetch: refetchEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment
  } = useEquipment();
  const { categories, isLoading: categoriesLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  
  // Состояния
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' или 'edit'
  const [currentEquipment, setCurrentEquipment] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [activeStep, setActiveStep] = useState(0);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    category_id: '',
    model: '',
    serial_number: '',
    inventory_number: '',
    location: '',
    status: 'active',
    responsible_person: '',
    notes: ''
  });
  
  // В начало файла после инициализации состояний добавить:
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = useState('create');
  const [currentCategory, setCurrentCategory] = useState(null);
  const [confirmCategoryDeleteOpen, setConfirmCategoryDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryFormError, setCategoryFormError] = useState('');
  
  // Получаем уникальные типы оборудования на основе категорий
  const activeCategories = categories
    .filter(category => category.is_active);
    
  const equipmentTypes = activeCategories
    .map(category => category.name);
  
  // Список уникальных локаций
  const locations = [...new Set(equipment.map(item => item.location).filter(Boolean))];
  
  // Фильтрация оборудования
  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.inventory_number?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || item.type === selectedCategory;
    const matchesLocation = !selectedLocation || item.location === selectedLocation;
    
    return matchesSearch && matchesCategory && matchesLocation;
  });
  
  // Функция получения иконки по типу оборудования
  const getEquipmentIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'computer': 
      case 'компьютер': return <ComputerIcon />;
      case 'printer': 
      case 'принтер': return <PrinterIcon />;
      case 'monitor': 
      case 'монитор': return <MonitorIcon />;
      default: return <DevicesIcon />;
    }
  };
  
  // Получение цвета чипа по статусу
  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'repair': return 'warning';
      case 'decommissioned': return 'error';
      default: return 'default';
    }
  };
  
  // Получение категории по ID
  const getCategoryById = (categoryId) => {
    return categories.find(cat => cat.id === categoryId) || null;
  };
  
  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Если выбрана категория, автоматически установим тип
    if (name === 'category_id') {
      const selectedCategory = getCategoryById(Number(value));
      if (selectedCategory) {
        setFormData(prev => ({
          ...prev,
          type: selectedCategory.name
        }));
      }
    }
  };
  
  // Обработчики шагов для Stepper
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
  };

  // Добавляем для сброса шага при открытии/закрытии диалога
  const handleDialogClose = () => {
    setOpenDialog(false);
    setActiveStep(0);
  };
  
  // Шаги для заполнения формы
  const steps = ['Основная информация', 'Технические детали', 'Размещение'];
  
  // Открытие диалога добавления
  const handleAddClick = () => {
    setFormData({
      name: '',
      type: '',
      category_id: '',
      model: '',
      serial_number: '',
      inventory_number: '',
      location: '',
      status: 'active',
      responsible_person: '',
      notes: ''
    });
    setDialogMode('add');
    setOpenDialog(true);
    setActiveStep(0);
  };
  
  // Открытие диалога редактирования
  const handleEditClick = (equipment) => {
    // Находим категорию по имени
    const categoryObj = categories.find(cat => cat.name === equipment.type);
    const categoryId = categoryObj ? categoryObj.id : '';
    
    setCurrentEquipment(equipment);
    setFormData({
      name: equipment.name || '',
      type: equipment.type || '',
      category_id: categoryId || '',
      model: equipment.model || '',
      serial_number: equipment.serial_number || '',
      inventory_number: equipment.inventory_number || '',
      location: equipment.location || '',
      status: equipment.status || 'active',
      responsible_person: equipment.responsible_person || '',
      notes: equipment.notes || ''
    });
    setDialogMode('edit');
    setOpenDialog(true);
    setActiveStep(0);
  };
  
  // Сохранение оборудования
  const handleSave = async () => {
    try {
      const dataToSend = { ...formData };
      
      // Преобразуем category_id в category
      if (dataToSend.category_id) {
        const category = getCategoryById(Number(dataToSend.category_id));
        if (category) {
          dataToSend.category = category.name;
          dataToSend.type = category.name;
        }
        delete dataToSend.category_id;
      }
      
      if (dialogMode === 'add') {
        await createEquipment(dataToSend);
        await refetchEquipment();
        
        setSnackbar({
          open: true,
          message: 'Оборудование успешно добавлено',
          severity: 'success'
        });
      } else {
        await updateEquipment({ id: currentEquipment.id, data: dataToSend });
        await refetchEquipment();
        
        setSnackbar({
          open: true,
          message: 'Оборудование успешно обновлено',
          severity: 'success'
        });
      }
      
      handleDialogClose();
    } catch (error) {
      console.error('Ошибка при сохранении оборудования:', error);
      setSnackbar({
        open: true,
        message: `Ошибка: ${error.response?.data?.detail || 'Не удалось сохранить оборудование'}`,
        severity: 'error'
      });
    }
  };
  
  // Удаление оборудования
  const handleDelete = async (id) => {
    if (window.confirm('Вы уверены, что хотите удалить это оборудование?')) {
      try {
        await deleteEquipment(id);
        
        // Обновляем данные без перезагрузки страницы
        await refetchEquipment();
        
        setSnackbar({
          open: true,
          message: 'Оборудование успешно удалено',
          severity: 'success'
        });
      } catch (error) {
        console.error('Ошибка при удалении оборудования:', error);
        
        // Проверяем, является ли ошибка 404 (оборудование не найдено)
        if (error?.response?.status === 404) {
          setSnackbar({
            open: true,
            message: 'Оборудование уже было удалено, обновляем данные',
            severity: 'info'
          });
          
          // Обновляем данные без перезагрузки
          await refetchEquipment();
        } else {
          setSnackbar({
            open: true,
            message: `Ошибка: ${error.response?.data?.detail || 'Не удалось удалить оборудование'}`,
            severity: 'error'
          });
        }
      }
    }
  };
  
  // Обработчик смены вкладок
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Закрытие уведомления
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // Проверка, что пользователь - администратор
  useEffect(() => {
    if (user && user.role !== 'admin') {
      // Перенаправление обычных пользователей через react-router
      navigate('/');
    }
  }, [user, navigate]);
  
  // Проверка загрузки данных
  const isLoading = equipmentLoading || categoriesLoading;
  
  // Управление категориями
  
  // Обработчик открытия диалога категории
  const handleCategoryDialogOpen = (mode, category = null) => {
    setCategoryDialogMode(mode);
    setCurrentCategory(category);
    
    if (mode === 'create') {
      setCategoryFormData({
        name: '',
        description: '',
        is_active: true
      });
    } else if (mode === 'edit' && category) {
      setCategoryFormData({
        name: category.name,
        description: category.description || '',
        is_active: category.is_active
      });
    }
    
    setCategoryFormError('');
    setCategoryDialogOpen(true);
  };

  // Обработчик закрытия диалога категории
  const handleCategoryDialogClose = () => {
    setCategoryDialogOpen(false);
  };

  // Обработчик изменения полей формы категории
  const handleCategoryFormChange = (e) => {
    const { name, value, checked } = e.target;
    setCategoryFormData(prev => ({
      ...prev,
      [name]: name === 'is_active' ? checked : value
    }));
  };

  // Валидация формы категории
  const validateCategoryForm = () => {
    if (!categoryFormData.name.trim()) {
      setCategoryFormError('Название категории обязательно');
      return false;
    }
    return true;
  };

  // Обработчик сохранения категории
  const handleCategorySubmit = async () => {
    if (!validateCategoryForm()) {
      return;
    }

    try {
      if (categoryDialogMode === 'create') {
        await createCategory(categoryFormData);
        // Принудительно обновляем данные, чтобы новая категория отобразилась
        await refetchEquipment();
        
        setSnackbar({
          open: true,
          message: 'Категория успешно создана',
          severity: 'success'
        });
      } else if (categoryDialogMode === 'edit' && currentCategory) {
        await updateCategory({
          id: currentCategory.id,
          data: categoryFormData
        });
        // Принудительно обновляем данные, чтобы обновления категории отобразились
        await refetchEquipment();
        
        setSnackbar({
          open: true,
          message: 'Категория успешно обновлена',
          severity: 'success'
        });
      }
      
      handleCategoryDialogClose();
    } catch (error) {
      console.error('Ошибка при сохранении категории:', error);
      setCategoryFormError('Произошла ошибка при сохранении категории');
      setSnackbar({
        open: true,
        message: `Ошибка: ${error.response?.data?.detail || 'Не удалось сохранить категорию'}`,
        severity: 'error'
      });
    }
  };

  // Обработчик клика на удаление категории
  const handleCategoryDeleteClick = (category) => {
    setCategoryToDelete(category);
    setConfirmCategoryDeleteOpen(true);
  };

  // Обработчик подтверждения удаления категории
  const handleCategoryDeleteConfirm = async () => {
    if (categoryToDelete) {
      try {
        await deleteCategory(categoryToDelete.id);
        // Принудительно обновляем данные после удаления категории
        await refetchEquipment();
        
        setSnackbar({
          open: true,
          message: 'Категория успешно удалена',
          severity: 'success'
        });
        setConfirmCategoryDeleteOpen(false);
        setCategoryToDelete(null);
      } catch (error) {
        console.error('Ошибка при удалении категории:', error);
        setSnackbar({
          open: true,
          message: `Ошибка: ${error.response?.data?.detail || 'Не удалось удалить категорию'}`,
          severity: 'error'
        });
      }
    }
  };

  // Обработчик отмены удаления категории
  const handleCategoryDeleteCancel = () => {
    setConfirmCategoryDeleteOpen(false);
    setCategoryToDelete(null);
  };
  
  // Функция для принудительного обновления данных
  const handleForceRefresh = () => {
    // Показываем уведомление о начале обновления
    setSnackbar({
      open: true,
      message: 'Обновление данных оборудования...',
      severity: 'info'
    });
    
    // Вызываем refetch для обновления данных
    refetchEquipment().then(() => {
      setSnackbar({
        open: true,
        message: 'Данные оборудования обновлены!',
        severity: 'success'
      });
    }).catch(error => {
      console.error('Ошибка при обновлении данных:', error);
      setSnackbar({
        open: true,
        message: 'Ошибка при обновлении данных!',
        severity: 'error'
      });
    });
  };
  
  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: 2, py: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', md: 'center' }, 
        gap: { xs: 2, md: 0 },
        mb: 3 
      }}>
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', md: 'auto' } }}>
          <Tooltip title="Принудительно обновить данные">
            <Button 
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleForceRefresh}
              sx={{ borderRadius: 2, flex: { xs: 1, md: 'initial' } }}
              size="small"
            >
              Обновить
            </Button>
          </Tooltip>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddClick}
            sx={{ borderRadius: 2, flex: { xs: 1, md: 'initial' } }}
            size="small"
          >
            Добавить
          </Button>
        </Box>
      </Box>
      
      {/* Табы для переключения между оборудованием и категориями */}
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ 
          mb: 3,
          borderBottom: 1, 
          borderColor: 'divider',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: { xs: '0.8rem', sm: '0.95rem' },
            minWidth: { xs: 'auto', sm: 120 },
            padding: { xs: '6px 10px', sm: '12px 16px' }
          }
        }}
      >
        <Tab 
          label="Все оборудование" 
          icon={<DevicesIcon fontSize="small" />} 
          iconPosition="start"
          id="equipment-tab"
        />
        <Tab 
          label="Категории" 
          icon={<BookmarkIcon fontSize="small" />} 
          iconPosition="start"
          id="categories-tab"
        />
        <Tab 
          label="Управление" 
          icon={<EditIcon fontSize="small" />} 
          iconPosition="start"
          id="category-management-tab"
        />
        <Tab 
          label="Местоположения" 
          icon={<LocationIcon fontSize="small" />} 
          iconPosition="start"
          id="locations-tab"
        />
      </Tabs>
      
      {/* Содержимое вкладки "Все оборудование" */}
      {tabValue === 0 && (
        <>
          {/* Поиск и фильтры */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            gap: 2, 
            mb: 3,
            alignItems: 'flex-start'
          }}>
            <TextField
              fullWidth
              placeholder="Поиск оборудования..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ 
                flex: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              gap: 2, 
              width: { xs: '100%', sm: 'auto' }
            }}>
              <FormControl 
                sx={{ 
                  minWidth: { xs: '100%', sm: 150 }, 
                  flex: { xs: 1, sm: 'initial' },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }} 
                size="small"
              >
                <InputLabel id="category-filter-label">Категория</InputLabel>
                <Select
                  labelId="category-filter-label"
                  value={selectedCategory}
                  label="Категория"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="">Все категории</MenuItem>
                  {equipmentTypes.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl 
                sx={{ 
                  minWidth: { xs: '100%', sm: 150 }, 
                  flex: { xs: 1, sm: 'initial' },
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2
                  }
                }} 
                size="small"
              >
                <InputLabel id="location-filter-label">Местоположение</InputLabel>
                <Select
                  labelId="location-filter-label"
                  value={selectedLocation}
                  label="Местоположение"
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <MenuItem value="">Все местоположения</MenuItem>
                  {locations.map((location) => (
                    <MenuItem key={location} value={location}>{location}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
          
          {/* Таблица оборудования */}
          <TableContainer 
            component={Paper} 
            sx={{ 
              borderRadius: 3, 
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              overflow: 'auto',
              mb: 3
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(33, 150, 243, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Название</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', sm: 'table-cell' } }}>Категория</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }}>Модель</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }}>Инв. номер</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', sm: 'table-cell' } }}>Расположение</TableCell>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : filteredEquipment.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        Оборудование не найдено
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipment.map((item) => (
                    <TableRow key={`equipment-${item.id}`}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getEquipmentIcon(item.type)}
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {item.name || "Без названия"}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{item.type || "Не указана"}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{item.model || "Не указана"}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{item.inventory_number || "Не указан"}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{item.location || "Не указано"}</TableCell>
                      <TableCell>
                        <Chip 
                          label={item.status || "Неизвестно"} 
                          size="small" 
                          color={getStatusColor(item.status)}
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleEditClick(item)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDelete(item.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      
      {/* Содержимое вкладки "Категории" */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Категории оборудования
          </Typography>
          <Grid container spacing={2}>
            {equipmentTypes.map((category) => (
              <Grid item xs={12} sm={6} md={4} key={`category-${category}`}>
                <Card sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {getEquipmentIcon(category)}
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                        {category}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {`Количество: ${equipment.filter(item => item.type === category).length}`}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      {/* Содержимое вкладки "Управление категориями" */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            gap: 2,
            mb: 3 
          }}>
            <Typography variant="h6" component="h1" sx={{ fontWeight: 600 }}>
              Управление категориями
              <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                Всего: {categories.length}
              </Typography>
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => handleCategoryDialogOpen('create')}
              sx={{ borderRadius: 2, textTransform: 'none', width: { xs: '100%', sm: 'auto' } }}
              size="small"
            >
              Добавить категорию
            </Button>
          </Box>

          {/* Таблица категорий */}
          <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(33, 150, 243, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600, width: 50 }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Название</TableCell>
                  <TableCell sx={{ fontWeight: 600, display: { xs: 'none', md: 'table-cell' } }}>Описание</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {categoriesLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography color="text.secondary">
                        Категории не найдены
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((category) => (
                    <TableRow key={`category-management-${category.id}`}>
                      <TableCell>{category.id}</TableCell>
                      <TableCell>{category.name}</TableCell>
                      <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{category.description || '-'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={category.is_active ? 'Активна' : 'Неактивна'} 
                          color={category.is_active ? 'success' : 'default'}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleCategoryDialogOpen('edit', category)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleCategoryDeleteClick(category)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      
      {/* Содержимое вкладки "Местоположения" */}
      {tabValue === 3 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Местоположения оборудования
          </Typography>
          <Grid container spacing={2}>
            {locations.map((location) => (
              <Grid item xs={12} sm={6} md={4} key={`location-${location}`}>
                <Card sx={{ 
                  borderRadius: 3, 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon />
                      <Typography variant="h6" sx={{ ml: 1, fontWeight: 600 }}>
                        {location}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {`Количество: ${equipment.filter(item => item.location === location).length}`}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
      
      {/* Диалог добавления/редактирования оборудования */}
      <Dialog 
        open={openDialog} 
        onClose={handleDialogClose}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: { 
            borderRadius: 3,
            backgroundColor: 'background.paper',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))'
          }
        }}
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle 
          sx={{ 
            fontWeight: 600, 
            pb: 1, 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
            px: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 2.5 }
          }}
        >
          {dialogMode === 'add' ? 
            <AddIcon color="primary" fontSize="small" /> : 
            <EditIcon color="primary" fontSize="small" />
          }
          {dialogMode === 'add' ? 'Добавить оборудование' : 'Редактировать оборудование'}
        </DialogTitle>
        
        <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 0, sm: 1 } }}>
          {activeStep === 0 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Основная информация об оборудовании
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 0 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Название оборудования"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl 
                    fullWidth 
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    required
                  >
                    <InputLabel id="category-select-label" shrink>Категория</InputLabel>
                    <Select
                      labelId="category-select-label"
                      name="category_id"
                      value={formData.category_id}
                      label="Категория"
                      onChange={handleChange}
                      displayEmpty
                      notched
                    >
                      <MenuItem value="" disabled>
                        <em>Выберите категорию</em>
                      </MenuItem>
                      {categories.filter(cat => cat.is_active).map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getEquipmentIcon(category.name)}
                            <Typography>{category.name}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControl 
                    fullWidth 
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    required
                  >
                    <InputLabel id="status-select-label" shrink>Статус</InputLabel>
                    <Select
                      labelId="status-select-label"
                      name="status"
                      value={formData.status}
                      label="Статус"
                      onChange={handleChange}
                      notched
                    >
                      <MenuItem value="active">
                        <Chip size="small" color="success" sx={{ mr: 1 }} /> Активно
                      </MenuItem>
                      <MenuItem value="inactive">
                        <Chip size="small" color="default" sx={{ mr: 1 }} /> Неактивно
                      </MenuItem>
                      <MenuItem value="repair">
                        <Chip size="small" color="warning" sx={{ mr: 1 }} /> На ремонте
                      </MenuItem>
                      <MenuItem value="decommissioned">
                        <Chip size="small" color="error" sx={{ mr: 1 }} /> Списано
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
          
          {activeStep === 1 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Информация о технических характеристиках
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 0 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Модель"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Серийный номер"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleChange}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Инвентарный номер"
                    name="inventory_number"
                    value={formData.inventory_number}
                    onChange={handleChange}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
          
          {activeStep === 2 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Информация о размещении
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 0 }}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Местоположение"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationIcon fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Ответственное лицо"
                    name="responsible_person"
                    value={formData.responsible_person}
                    onChange={handleChange}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Примечания"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    multiline
                    rows={2}
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)'
                      } 
                    }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: { xs: 2, sm: 3 }, pt: 1, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleDialogClose}
            variant="outlined"
            sx={{ 
              borderRadius: 2, 
              textTransform: 'none',
            }}
            color="inherit"
          >
            Отмена
          </Button>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {activeStep > 0 && (
              <Button 
                onClick={handleBack}
                variant="outlined"
                sx={{ 
                  borderRadius: 2, 
                  textTransform: 'none',
                }}
                startIcon={<ArrowBackIcon fontSize="small" />}
              >
                Назад
              </Button>
            )}
            
            {activeStep < steps.length - 1 ? (
              <Button 
                onClick={handleNext}
                variant="contained"
                sx={{ 
                  borderRadius: 2, 
                  textTransform: 'none',
                }}
                endIcon={<ArrowForwardIcon fontSize="small" />}
              >
                Далее
              </Button>
            ) : (
              <Button 
                onClick={handleSave}
                variant="contained"
                color="primary"
                sx={{ 
                  borderRadius: 2, 
                  textTransform: 'none',
                }}
                startIcon={dialogMode === 'add' ? <AddIcon fontSize="small" /> : <CheckIcon fontSize="small" />}
              >
                {dialogMode === 'add' ? 'Добавить' : 'Сохранить'}
              </Button>
            )}
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Диалог создания/редактирования категории */}
      <Dialog
        open={categoryDialogOpen}
        onClose={handleCategoryDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          {categoryDialogMode === 'create' ? 'Создание новой категории' : 'Редактирование категории'}
        </DialogTitle>
        <DialogContent>
          {categoryFormError && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {categoryFormError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Название категории"
            type="text"
            fullWidth
            variant="outlined"
            value={categoryFormData.name}
            onChange={handleCategoryFormChange}
            required
            sx={{ mb: 2, mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Описание"
            type="text"
            fullWidth
            variant="outlined"
            value={categoryFormData.description}
            onChange={handleCategoryFormChange}
            multiline
            rows={3}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={categoryFormData.is_active}
                onChange={handleCategoryFormChange}
                name="is_active"
                color="primary"
              />
            }
            label="Активна"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleCategoryDialogClose}
            color="inherit"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleCategorySubmit}
            color="primary"
            variant="contained"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            {categoryDialogMode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления категории */}
      <Dialog
        open={confirmCategoryDeleteOpen}
        onClose={handleCategoryDeleteCancel}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          Подтверждение удаления
        </DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите удалить категорию "{categoryToDelete?.name}"?
            {categoryToDelete && equipment.filter(item => item.type === categoryToDelete.name).length > 0 && (
              <Box mt={1}>
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  Эта категория используется в оборудовании. При удалении все связанное оборудование может потерять категорию.
                </Alert>
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={handleCategoryDeleteCancel}
            color="inherit"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleCategoryDeleteConfirm}
            color="error"
            variant="contained"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Уведомление */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EquipmentManagementPage; 