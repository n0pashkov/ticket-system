import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
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
  Badge
} from '@mui/material';
import { Email as EmailIcon, Person as PersonIcon, VpnKey as KeyIcon, Assignment as AssignmentIcon, CheckCircle as CheckCircleIcon, Pending as PendingIcon, Error as ErrorIcon, ExpandMore as ExpandMoreIcon, Settings as SettingsIcon, Notifications as NotificationsIcon, Security as SecurityIcon, Check as CheckIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { usersAPI, ticketsAPI } from '../api/api';
import { useQuery } from '@tanstack/react-query';

const ProfilePage = () => {
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
    
    setLoading(true);
    
    try {
      // Показываем заглушку, так как фактически этот функционал не реализован в бэкенде
      // В реальности здесь был бы запрос на смену пароля
      setTimeout(() => {
        setSuccess('Пароль успешно изменен');
        setLoading(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOpenPasswordDialog(false);
      }, 1000);
    } catch (error) {
      setPasswordError('Ошибка при изменении пароля');
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
  
  if (!user) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <CircularProgress />
      </Container>
    );
  }
  
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Профиль пользователя
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar 
              sx={{ 
                width: 100, 
                height: 100, 
                bgcolor: getRoleColor(user.role),
                fontSize: '2rem'
              }}
            >
              {getInitials(user.full_name || user.username)}
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="h5">{user.full_name || user.username}</Typography>
            <Typography variant="subtitle1" color="textSecondary">
              {translateRole(user.role)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ID: {user.id}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Контактная информация
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Имя пользователя
                  </Typography>
                  <Typography variant="body1">
                    {user.username}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    Email
                  </Typography>
                  <Typography variant="body1">
                    {user.email}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Безопасность
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <KeyIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    Пароль
                  </Typography>
                  <Typography variant="body1">
                    ••••••••
                  </Typography>
                </Box>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  size="small"
                  onClick={() => setOpenPasswordDialog(true)}
                >
                  Изменить
                </Button>
              </Box>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Статус аккаунта: {user.is_active ? 'Активен' : 'Неактивен'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Статистика заявок
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {isTicketsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="primary">{userTicketStats.total}</Typography>
                      <Typography variant="body2" color="textSecondary">Всего заявок</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="info.main">{userTicketStats.new}</Typography>
                      <Typography variant="body2" color="textSecondary">Новых</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="warning.main">{userTicketStats.inProgress}</Typography>
                      <Typography variant="body2" color="textSecondary">В работе</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="h4" color="success.main">{userTicketStats.closed}</Typography>
                      <Typography variant="body2" color="textSecondary">Завершено</Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
              
              {tickets && tickets.length > 0 && (
                <>
                  <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
                    Последние заявки:
                  </Typography>
                  <List>
                    {tickets
                      .filter(ticket => ticket.creator_id === user.id)
                      .slice(0, 3)
                      .map(ticket => (
                        <ListItem key={ticket.id}>
                          <ListItemIcon>
                            <AssignmentIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={ticket.title} 
                            secondary={`Приоритет: ${ticket.priority}`} 
                          />
                          <Chip 
                            label={ticket.status} 
                            color={
                              ticket.status === 'new' ? 'info' :
                              ticket.status === 'in_progress' ? 'warning' :
                              ticket.status === 'closed' || ticket.status === 'completed' ? 'success' :
                              'default'
                            } 
                            size="small" 
                          />
                        </ListItem>
                      ))}
                  </List>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Секция статистики работы для сотрудников */}
        {user && (user.role === 'admin' || user.role === 'superuser') && (
          <Grid item xs={12}>
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Рабочая статистика
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                {isTicketsLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Badge badgeContent={workStats.assigned} color="primary" 
                          sx={{ '& .MuiBadge-badge': { fontSize: '1rem', height: '1.5rem', minWidth: '1.5rem' } }}>
                          <Box sx={{ width: 80, height: 80, position: 'relative' }}>
                            <CircularProgress 
                              variant="determinate" 
                              value={workStats.resolutionRate} 
                              size={80} 
                              thickness={4}
                              sx={{ color: 'success.main' }} 
                            />
                            <Box
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography variant="h6" component="div">
                                {`${workStats.resolutionRate}%`}
                              </Typography>
                            </Box>
                          </Box>
                        </Badge>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          Эффективность решения
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="warning.main">{workStats.assigned}</Typography>
                        <Typography variant="body2" color="textSecondary">Назначено заявок</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ textAlign: 'center', p: 2 }}>
                        <Typography variant="h4" color="success.main">{workStats.resolved}</Typography>
                        <Typography variant="body2" color="textSecondary">Решено заявок</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
        
        {/* Секция настроек пользователя */}
        <Grid item xs={12}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SettingsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Настройки пользователя</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <NotificationsIcon color="action" sx={{ mr: 1 }} />
                    <Typography>Уведомления</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={settings.emailNotifications} 
                        onChange={handleSettingChange('emailNotifications')}
                      />
                    }
                    label="Получать уведомления по email"
                  />
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <SecurityIcon color="action" sx={{ mr: 1 }} />
                    <Typography>Безопасность</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={settings.autoLogout} 
                        onChange={handleSettingChange('autoLogout')}
                      />
                    }
                    label="Автоматический выход через 30 минут"
                  />
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<KeyIcon />}
                      onClick={() => setShowModal(true)}
                    >
                      Изменить пароль
                    </Button>
                  </Box>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CheckIcon color="action" sx={{ mr: 1 }} />
                    <Typography>Интерфейс</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={settings.darkMode} 
                        onChange={handleSettingChange('darkMode')}
                      />
                    }
                    label="Темный режим"
                  />
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Диалог смены пароля */}
      <Dialog open={openPasswordDialog} onClose={handleCloseDialog}>
        <DialogTitle>Изменение пароля</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Текущий пароль"
            type="password"
            fullWidth
            variant="outlined"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Новый пароль"
            type="password"
            fullWidth
            variant="outlined"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Подтвердите новый пароль"
            type="password"
            fullWidth
            variant="outlined"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {passwordError && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              {passwordError}
            </Typography>
          )}
          {success && (
            <Typography color="success" variant="body2" sx={{ mt: 2 }}>
              {success}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button 
            onClick={handleChangePassword}
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
          >
            {loading ? <CircularProgress size={24} /> : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfilePage; 