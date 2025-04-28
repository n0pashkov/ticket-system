import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Box, 
  Grid,
  Avatar,
  Divider,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Alert,
  IconButton
} from '@mui/material';
import { Email as EmailIcon, Person as PersonIcon, VpnKey as KeyIcon, Assignment as AssignmentIcon, CheckCircle as CheckCircleIcon, Pending as PendingIcon, Error as ErrorIcon, ExpandMore as ExpandMoreIcon, Settings as SettingsIcon, Notifications as NotificationsIcon, Security as SecurityIcon, Check as CheckIcon, ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { usersAPI, ticketsAPI } from '../api/api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    darkMode: false,
    autoLogout: true
  });
  
  // Запрос на получение тикетов пользователя
  const { data: tickets, isLoading: isTicketsLoading } = useQuery({
    queryKey: ['userTickets'],
    queryFn: async () => {
      const response = await ticketsAPI.getAll();
      return response.data;
    },
    enabled: !!user
  });
  
  // Статистика по тикетам пользователя
  const userTicketStats = React.useMemo(() => {
    if (!tickets) return { total: 0, new: 0, inProgress: 0, closed: 0 };
    
    // Фильтруем тикеты, созданные текущим пользователем
    const userTickets = tickets.filter(ticket => ticket.creator_id === user.id);
    
    return {
      total: userTickets.length,
      new: userTickets.filter(ticket => ticket.status === 'new').length,
      inProgress: userTickets.filter(ticket => ticket.status === 'in_progress').length,
      closed: userTickets.filter(ticket => ['closed', 'completed'].includes(ticket.status)).length
    };
  }, [tickets, user]);
  
  // Определение цвета аватара в зависимости от роли
  const getRoleColor = (role) => {
    switch(role) {
      case 'admin':
        return '#f44336'; // красный для админа
      case 'agent':
        return '#2196f3'; // синий для агента
      default:
        return '#4caf50'; // зеленый для обычного пользователя
    }
  };
  
  // Перевод роли на русский
  const translateRole = (role) => {
    switch(role) {
      case 'admin':
        return 'Администратор';
      case 'agent':
        return 'Технический специалист';
      default:
        return 'Пользователь';
    }
  };
  
  // Получение инициалов из имени
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };
  
  // Обработка изменения пароля (заглушка, так как бэкенд не поддерживает)
  const handleChangePassword = async () => {
    // Проверка совпадения паролей
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    
    // Проверка длины пароля
    if (newPassword.length < 8) {
      setPasswordError('Пароль должен содержать не менее 8 символов');
      return;
    }
    
    // Проверка наличия текущего пароля
    if (!currentPassword) {
      setPasswordError('Введите текущий пароль');
      return;
    }
    
    setLoading(true);
    setPasswordError('');
    
    try {
      // Обновляем пароль пользователя через новый специальный API метод
      await usersAPI.changePassword(newPassword, currentPassword);
      
      setSuccess('Пароль успешно изменен');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setOpenPasswordDialog(false);
        setSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Ошибка при изменении пароля:', error);
      setPasswordError(
        error.response?.data?.detail || 
        'Ошибка при изменении пароля. Проверьте текущий пароль и попробуйте снова.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseDialog = () => {
    setOpenPasswordDialog(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };
  
  const handleSettingChange = (setting) => (event) => {
    setSettings({
      ...settings,
      [setting]: event.target.checked
    });
    // В реальном приложении здесь был бы API-запрос для сохранения настроек
  };
  
  // Расчет статистики работы
  const workStats = React.useMemo(() => {
    if (!tickets) return { assigned: 0, resolved: 0 };
    
    // Для тех, кто назначен исполнителем
    const assignedTickets = tickets.filter(ticket => 
      ticket.assignee_id === user?.id && 
      !['closed', 'completed'].includes(ticket.status)
    );
    
    // Решенные тикеты
    const resolvedTickets = tickets.filter(ticket => 
      ticket.assignee_id === user?.id && 
      ['closed', 'completed'].includes(ticket.status)
    );
    
    return {
      assigned: assignedTickets.length,
      resolved: resolvedTickets.length,
      resolutionRate: resolvedTickets.length ? 
        Math.round((resolvedTickets.length / (assignedTickets.length + resolvedTickets.length)) * 100) : 0
    };
  }, [tickets, user]);

  // Переход на главную
  const handleBack = () => {
    navigate('/');
  };
  
  if (!user) {
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
  
  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: '100vw', 
      overflow: 'hidden',
      position: 'relative',
      boxSizing: 'border-box',
      p: 2
    }}>
      {/* Заголовок и кнопка назад */}
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
            onClick={handleBack}
            sx={{ 
              mr: 1,
              backgroundColor: 'rgba(25, 118, 210, 0.08)'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Мой профиль
          </Typography>
        </Box>
      </Box>

      {/* Основная информация */}
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
                width: 70, 
                height: 70, 
                bgcolor: 'white', 
                color: getRoleColor(user.role),
                fontSize: '1.8rem',
                fontWeight: 'bold',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
              }}
            >
              {getInitials(user.full_name || user.username)}
            </Avatar>
            <Box sx={{ ml: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, fontSize: '1.3rem' }}>
                {user.full_name || user.username}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Chip 
                  label={translateRole(user.role)} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'rgba(255, 255, 255, 0.2)', 
                    color: 'white',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
                <Typography variant="body2" sx={{ ml: 1, opacity: 0.9 }}>
                  ID: {user.id}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
      
      <Grid container spacing={3}>
        {/* Контактная информация */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 4, 
            height: '100%',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Контактная информация
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: 'rgba(25, 118, 210, 0.08)', 
                  color: '#2196f3',
                  width: 36,
                  height: 36,
                  mr: 2
                }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Имя пользователя
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user.username}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ 
                  bgcolor: 'rgba(25, 118, 210, 0.08)', 
                  color: '#2196f3',
                  width: 36,
                  height: 36,
                  mr: 2
                }}>
                  <EmailIcon />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Email
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {user.email || 'Не указан'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Безопасность */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            borderRadius: 4, 
            height: '100%',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <SecurityIcon sx={{ mr: 1, color: 'action.active' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Безопасность
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Button
                variant="contained"
                startIcon={<KeyIcon />}
                onClick={() => setOpenPasswordDialog(true)}
                sx={{ 
                  borderRadius: 2,
                  boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)',
                  mb: 2
                }}
              >
                Изменить пароль
              </Button>
              
              <Typography variant="body2" color="textSecondary">
                Рекомендуется регулярно менять пароль для повышения безопасности аккаунта.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Статистика заявок */}
        <Grid item xs={12}>
          <Card sx={{ 
            borderRadius: 4, 
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <AssignmentIcon sx={{ mr: 1, color: 'action.active' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Статистика заявок
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{ 
                    bgcolor: 'rgba(33, 150, 243, 0.08)', 
                    borderRadius: 3, 
                    boxShadow: 'none' 
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196f3' }}>
                        {userTicketStats.total}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Всего заявок
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card sx={{ 
                    bgcolor: 'rgba(255, 167, 38, 0.08)', 
                    borderRadius: 3, 
                    boxShadow: 'none' 
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffa726' }}>
                        {userTicketStats.new}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Новых
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card sx={{ 
                    bgcolor: 'rgba(41, 182, 246, 0.08)', 
                    borderRadius: 3, 
                    boxShadow: 'none' 
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#29b6f6' }}>
                        {userTicketStats.inProgress}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        В работе
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card sx={{ 
                    bgcolor: 'rgba(102, 187, 106, 0.08)', 
                    borderRadius: 3, 
                    boxShadow: 'none' 
                  }}>
                    <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#66bb6a' }}>
                        {userTicketStats.closed}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Закрытых
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              
              {user.role === 'agent' && (
                <Box sx={{ mt: 3 }}>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Эффективность работы
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ 
                        bgcolor: 'rgba(41, 182, 246, 0.08)', 
                        borderRadius: 3, 
                        boxShadow: 'none' 
                      }}>
                        <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#29b6f6' }}>
                            {workStats.assigned}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Назначено
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ 
                        bgcolor: 'rgba(102, 187, 106, 0.08)', 
                        borderRadius: 3, 
                        boxShadow: 'none' 
                      }}>
                        <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#66bb6a' }}>
                            {workStats.resolved}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Решено
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <Card sx={{ 
                        bgcolor: 'rgba(102, 187, 106, 0.08)', 
                        borderRadius: 3, 
                        boxShadow: 'none' 
                      }}>
                        <CardContent sx={{ textAlign: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#66bb6a' }}>
                            {workStats.resolutionRate}%
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Эффективность
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Настройки */}
        <Grid item xs={12}>
          <Card sx={{ 
            borderRadius: 4, 
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}>
            <CardContent sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                <SettingsIcon sx={{ mr: 1, color: 'action.active' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Настройки
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <List disablePadding>
                <ListItem 
                  disableGutters
                  secondaryAction={
                    <Switch
                      edge="end"
                      checked={settings.emailNotifications}
                      onChange={handleSettingChange('emailNotifications')}
                    />
                  }
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar sx={{ 
                      bgcolor: 'rgba(25, 118, 210, 0.08)', 
                      color: '#2196f3',
                      width: 32,
                      height: 32,
                    }}>
                      <NotificationsIcon sx={{ fontSize: '1.2rem' }} />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Уведомления по email
                      </Typography>
                    }
                    secondary="Получать уведомления о новых комментариях и изменениях в заявках"
                  />
                </ListItem>
                
                <Divider component="li" sx={{ my: 1 }} />
                
                <ListItem 
                  disableGutters
                  secondaryAction={
                    <Switch
                      edge="end"
                      checked={settings.darkMode}
                      onChange={handleSettingChange('darkMode')}
                    />
                  }
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar sx={{ 
                      bgcolor: 'rgba(25, 118, 210, 0.08)', 
                      color: '#2196f3',
                      width: 32,
                      height: 32,
                    }}>
                      <SettingsIcon sx={{ fontSize: '1.2rem' }} />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Темная тема
                      </Typography>
                    }
                    secondary="Переключить на темный режим отображения"
                  />
                </ListItem>
                
                <Divider component="li" sx={{ my: 1 }} />
                
                <ListItem 
                  disableGutters
                  secondaryAction={
                    <Switch
                      edge="end"
                      checked={settings.autoLogout}
                      onChange={handleSettingChange('autoLogout')}
                    />
                  }
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Avatar sx={{ 
                      bgcolor: 'rgba(25, 118, 210, 0.08)', 
                      color: '#2196f3',
                      width: 32,
                      height: 32,
                    }}>
                      <SecurityIcon sx={{ fontSize: '1.2rem' }} />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        Автоматический выход
                      </Typography>
                    }
                    secondary="Автоматически выходить из системы после 30 минут бездействия"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Диалог изменения пароля */}
      <Dialog 
        open={openPasswordDialog} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Изменение пароля
        </DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {passwordError}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
              {success}
            </Alert>
          )}
          
          <TextField
            margin="dense"
            label="Текущий пароль"
            type="password"
            fullWidth
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            variant="outlined"
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <TextField
            margin="dense"
            label="Новый пароль"
            type="password"
            fullWidth
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            variant="outlined"
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
          <TextField
            margin="dense"
            label="Повторите новый пароль"
            type="password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            variant="outlined"
            sx={{ 
              mb: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Отмена
          </Button>
          <Button 
            onClick={handleChangePassword} 
            variant="contained"
            disabled={loading}
            sx={{ 
              borderRadius: 2,
              boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)'
            }}
          >
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProfilePage; 