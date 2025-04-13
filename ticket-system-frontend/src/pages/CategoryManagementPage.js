import { useState } from 'react';
import {
  Typography, Box, Paper, Button, TextField, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogActions, DialogContent, DialogTitle,
  CircularProgress, Alert, Switch, FormControlLabel
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import useCategories from '../hooks/useCategories';
import { useAuth } from '../context/AuthContext';

const CategoryManagementPage = () => {
  const { user } = useAuth();
  const { categories, isLoading, error, createCategory, updateCategory, deleteCategory } = useCategories();
  
  // Состояние для модального окна
  const [open, setOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // 'create' или 'edit'
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Проверка, является ли пользователь администратором
  const isAdmin = user?.role === 'admin';

  // Обработчики для модального окна
  const handleOpen = (mode, category = null) => {
    setDialogMode(mode);
    setCurrentCategory(category);
    
    if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        is_active: true
      });
    } else if (mode === 'edit' && category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        is_active: category.is_active
      });
    }
    
    setFormError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'is_active' ? checked : value
    }));
  };

  // Валидация формы
  const validateForm = () => {
    if (!formData.name.trim()) {
      setFormError('Название категории обязательно');
      return false;
    }
    return true;
  };

  // Обработчик отправки формы
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (dialogMode === 'create') {
        await createCategory(formData);
      } else if (dialogMode === 'edit' && currentCategory) {
        await updateCategory({
          id: currentCategory.id,
          data: formData
        });
      }
      
      handleClose();
    } catch (error) {
      console.error('Error submitting category:', error);
      setFormError('Произошла ошибка при сохранении категории');
    }
  };

  // Обработчик удаления категории
  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setConfirmDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (categoryToDelete) {
      try {
        await deleteCategory(categoryToDelete.id);
        setConfirmDeleteOpen(false);
        setCategoryToDelete(null);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDeleteOpen(false);
    setCategoryToDelete(null);
  };

  if (!isAdmin) {
    return (
      <Box>
        <Alert severity="error">
          У вас нет прав для доступа к этой странице. Эта страница доступна только администраторам.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Управление категориями заявок
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen('create')}
        >
          Добавить категорию
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Произошла ошибка при загрузке категорий
        </Alert>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Название</TableCell>
                <TableCell>Описание</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Действия</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    Категории не найдены
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>{category.id}</TableCell>
                    <TableCell>{category.name}</TableCell>
                    <TableCell>{category.description || '-'}</TableCell>
                    <TableCell>
                      {category.is_active ? 'Активна' : 'Неактивна'}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpen('edit', category)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteClick(category)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Диалог создания/редактирования категории */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' ? 'Создание новой категории' : 'Редактирование категории'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
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
            value={formData.name}
            onChange={handleChange}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            name="description"
            label="Описание"
            type="text"
            fullWidth
            variant="outlined"
            value={formData.description}
            onChange={handleChange}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={handleChange}
                name="is_active"
                color="primary"
              />
            }
            label="Активна"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleSubmit} color="primary" variant="contained">
            {dialogMode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog open={confirmDeleteOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Подтверждение удаления</DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите удалить категорию "{categoryToDelete?.name}"?
            {categoryToDelete && categoryToDelete.tickets?.length > 0 && (
              <Box mt={1}>
                <Alert severity="warning">
                  Эта категория используется в заявках. При удалении категория будет помечена как неактивная.
                </Alert>
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Отмена
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManagementPage; 