import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, IconButton, 
  Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton,
  Box, CssBaseline, Divider, Container, useMediaQuery, useTheme,
  BottomNavigation, BottomNavigationAction, Paper, Avatar, Badge, Chip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CategoryIcon from '@mui/icons-material/Category';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ComputerIcon from '@mui/icons-material/Computer';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';

const drawerWidth = 280;

const Layout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { darkMode, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeItem, setActiveItem] = useState('/');

  useEffect(() => {
    // Устанавливаем активный пункт меню на основе текущего пути
    setActiveItem(location.pathname);
  }, [location.pathname]);

  // Определяем текущую активную вкладку для нижней навигации
  const getNavValue = () => {
    if (location.pathname === '/' || location.pathname === '/admin' || location.pathname === '/agent') return 0;
    if (location.pathname.startsWith('/tickets')) return 1;
    if (location.pathname === '/profile') return 2;
    return 0;
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  // Определяем базовые пункты меню для всех пользователей
  const baseMenuItems = [
    { text: 'Информационная панель', icon: <DashboardIcon />, path: '/' },
    { text: 'Заявки', icon: <ConfirmationNumberIcon />, path: '/tickets' },
    { text: 'Создать заявку', icon: <AddCircleIcon />, path: '/tickets/new' },
    { text: 'Профиль', icon: <PersonIcon />, path: '/profile' },
  ];
  
  // Пункты меню для обычных пользователей
  const userMenuItems = [];
  
  // Пункты меню для администраторов
  const adminMenuItems = [
    { text: 'Управление пользователями', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Управление оборудованием', icon: <ComputerIcon />, path: '/admin/equipment' },
  ];
  
  // Формируем итоговый список пунктов меню в зависимости от роли
  let menuItems = [...baseMenuItems];
  let adminSectionItems = []; // Для отдельной секции админ-панели
  
  if (user?.role === 'admin') {
    menuItems = [
      { text: 'Панель администратора', icon: <DashboardIcon />, path: '/' },
      ...baseMenuItems.filter(item => item.path !== '/'),
    ];
    // Сохраняем админ-пункты для отдельной секции
    adminSectionItems = [...adminMenuItems];
  } else if (user?.role === 'agent') {
    menuItems = [
      { text: 'Панель специалиста', icon: <DashboardIcon />, path: '/' },
      ...baseMenuItems.filter(item => item.path !== '/'),
    ];
  } else {
    menuItems = [...baseMenuItems];
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Шапка меню с градиентным фоном */}
      <Box 
        sx={{ 
          p: 2, 
          background: 'linear-gradient(120deg, #2196f3 0%, #21cbf3 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold" component="div">
            Система заявок
          </Typography>
          <Badge 
            color="error" 
            badgeContent={3} 
            sx={{ ml: 'auto' }}
          >
            <IconButton color="inherit" size="small">
              <NotificationsIcon />
            </IconButton>
          </Badge>
        </Box>
        
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'white', 
                color: getRoleColor(user.role),
                width: 44,
                height: 44,
                fontWeight: 'bold',
                fontSize: '1.1rem'
              }}
            >
              {getInitials(user.full_name || user.username)}
            </Avatar>
            <Box sx={{ ml: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                {user.full_name || user.username}
              </Typography>
              <Chip 
                label={translateRole(user.role)} 
                size="small"
                sx={{ 
                  bgcolor: 'rgba(255, 255, 255, 0.2)', 
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.7rem',
                  height: 22
                }}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Пункты меню */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <Typography 
          variant="overline" 
          sx={{ 
            ml: 2, 
            color: 'text.secondary', 
            fontWeight: 600,
            letterSpacing: 1
          }}
        >
          Меню
        </Typography>
        
        <List sx={{ mt: 1 }}>
          {menuItems.map((item) => {
            const isActive = activeItem === item.path;
            
            return (
              <ListItem 
                key={item.text}
                disablePadding 
                sx={{ mb: 0.5 }}
              >
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    background: isActive ? 'rgba(33, 150, 243, 0.08)' : 'transparent',
                    color: isActive ? '#2196f3' : 'inherit',
                    '&:hover': {
                      background: isActive 
                        ? 'rgba(33, 150, 243, 0.12)' 
                        : 'rgba(0, 0, 0, 0.04)'
                    },
                    transition: 'all 0.2s'
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      color: isActive ? '#2196f3' : 'action.active',
                      minWidth: 42
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {user?.role === 'admin' && adminSectionItems.length > 0 && (
          <>
            <Typography 
              variant="overline" 
              sx={{ 
                ml: 2, 
                mt: 3, 
                color: 'text.secondary', 
                fontWeight: 600,
                letterSpacing: 1,
                display: 'block'
              }}
            >
              Управление
            </Typography>
            
            <List sx={{ mt: 1 }}>
              {adminSectionItems.map((item) => {
                const isActive = activeItem === item.path;
                
                return (
                  <ListItem 
                    key={item.text}
                    disablePadding 
                    sx={{ mb: 0.5 }}
                  >
                    <ListItemButton
                      onClick={() => handleNavigation(item.path)}
                      sx={{
                        borderRadius: 2,
                        background: isActive ? 'rgba(33, 150, 243, 0.08)' : 'transparent',
                        color: isActive ? '#2196f3' : 'inherit',
                        '&:hover': {
                          background: isActive 
                            ? 'rgba(33, 150, 243, 0.12)' 
                            : 'rgba(0, 0, 0, 0.04)'
                        },
                        transition: 'all 0.2s'
                      }}
                    >
                      <ListItemIcon 
                        sx={{ 
                          color: isActive ? '#2196f3' : 'action.active',
                          minWidth: 42
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText primary={item.text} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </>
        )}
      </Box>

      {/* Блок выхода из системы */}
      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <ListItem 
          disablePadding
        >
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              '&:hover': {
                background: 'rgba(244, 67, 54, 0.08)',
                color: '#f44336'
              },
              transition: 'all 0.2s'
            }}
          >
            <ListItemIcon sx={{ minWidth: 42 }}>
              <LogoutIcon color="error" />
            </ListItemIcon>
            <ListItemText 
              primary="Выход из системы" 
              primaryTypographyProps={{ fontWeight: 500 }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ 
      display: 'flex',
      bgcolor: 'background.default',
      color: 'text.primary', 
      minHeight: '100vh'
    }}>
      <CssBaseline />

      {/* AppBar - верхняя панель навигации */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: '100%',
          backgroundColor: 'background.paper',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600
            }}
          >
            {/* Название текущей страницы */}
            {location.pathname === '/' && 'Информационная панель'}
            {location.pathname === '/tickets' && 'Заявки'}
            {location.pathname === '/tickets/new' && 'Создание заявки'}
            {location.pathname === '/profile' && 'Профиль'}
            {location.pathname === '/admin' && 'Панель администратора'}
            {location.pathname === '/admin/users' && 'Управление пользователями'}
            {location.pathname === '/admin/equipment' && 'Управление оборудованием'}
            {location.pathname === '/agent' && 'Панель специалиста'}
          </Typography>

          {/* Иконка переключения темы */}
          <IconButton 
            color="primary" 
            onClick={toggleTheme}
            sx={{ 
              backgroundColor: 'action.hover', 
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: 'action.selected'
              }
            }}
          >
            {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Боковое меню */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          '& .MuiDrawer-paper': { 
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRadius: { xs: 0, sm: '0 16px 16px 0' },
            boxShadow: darkMode ? '0 0 20px rgba(0, 0, 0, 0.3)' : '0 0 20px rgba(0, 0, 0, 0.05)',
            border: 'none',
            bgcolor: 'background.paper',
          },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Основной контент */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 3 }, 
          width: '100%',
          pb: isMobile ? 8 : 3, // Добавляем отступ снизу для мобильных устройств
          minHeight: '100vh'
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" disableGutters>
          <Outlet />
        </Container>
      </Box>

      {/* Нижняя навигация только для мобильных устройств */}
      {isMobile && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0,
            zIndex: 1100,
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
            boxShadow: darkMode ? '0 -2px 10px rgba(0, 0, 0, 0.3)' : '0 -2px 10px rgba(0, 0, 0, 0.1)'
          }} 
          elevation={3}
        >
          <BottomNavigation
            value={getNavValue()}
            onChange={(event, newValue) => {
              switch(newValue) {
                case 0:
                  // Всегда перенаправляем на главную страницу
                  navigate('/');
                  break;
                case 1:
                  navigate('/tickets');
                  break;
                case 2:
                  navigate('/profile');
                  break;
                default:
                  break;
              }
            }}
            showLabels
            sx={{ 
              height: 64
            }}
          >
            <BottomNavigationAction label="Главная" icon={<DashboardIcon />} />
            <BottomNavigationAction 
              label="Заявки" 
              icon={<ConfirmationNumberIcon />} 
            />
            <BottomNavigationAction label="Профиль" icon={<PersonIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default Layout; 