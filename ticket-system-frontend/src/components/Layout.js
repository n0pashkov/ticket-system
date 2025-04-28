import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, Toolbar, Typography, Button, IconButton, 
  Drawer, List, ListItem, ListItemIcon, ListItemText,
  Box, CssBaseline, Divider, Container, useMediaQuery, useTheme,
  BottomNavigation, BottomNavigationAction, Paper
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
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Определяем текущую активную вкладку для нижней навигации
  const getNavValue = () => {
    if (location.pathname === '/') return 0;
    if (location.pathname.startsWith('/tickets')) return 1;
    if (location.pathname === '/profile') return 2;
    if (location.pathname === '/settings') return 3;
    return 0;
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Определяем базовые пункты меню для всех пользователей
  const baseMenuItems = [
    { text: 'Информационная панель', icon: <DashboardIcon />, path: '/' },
    { text: 'Заявки', icon: <ConfirmationNumberIcon />, path: '/tickets' },
    { text: 'Профиль', icon: <PersonIcon />, path: '/profile' },
    { text: 'Настройки', icon: <SettingsIcon />, path: '/settings' },
  ];
  
  // Пункты меню для обычных пользователей
  const userMenuItems = [
    { text: 'Создать заявку', icon: <AddCircleIcon />, path: '/tickets/new' },
  ];
  
  // Пункты меню для администраторов
  const adminMenuItems = [
    { text: 'Управление категориями', icon: <CategoryIcon />, path: '/category-management' },
    { text: 'Управление пользователями', icon: <PeopleIcon />, path: '/manage-users' },
  ];
  
  // Формируем итоговый список пунктов меню в зависимости от роли
  let menuItems = [...baseMenuItems];
  
  if (user?.role === 'admin') {
    menuItems = [...baseMenuItems, ...userMenuItems, ...adminMenuItems];
  } else if (user?.role === 'agent') {
    menuItems = [...baseMenuItems];
  } else {
    menuItems = [...baseMenuItems, ...userMenuItems];
  }

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Система заявок
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem 
            onClick={() => handleNavigation(item.path)}
            key={item.text}
            sx={{ cursor: 'pointer' }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem 
          onClick={handleLogout}
          sx={{ cursor: 'pointer' }}
        >
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Выход" />
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      {/* AppBar только для десктопа или с кнопкой меню для мобильных */}
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Система заявок
          </Typography>
          {user ? (
            <Typography variant="body1" color="inherit">
              Привет, {user.name}
            </Typography>
          ) : (
            <Button color="inherit" onClick={() => navigate('/login')}>
              Вход
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Боковое меню - всегда видимо на десктопе */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Временное боковое меню для мобильных (открывается по кнопке) */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        {/* Постоянное боковое меню для десктопа */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* Основной контент */}
      <Box
        component="main"
        sx={{ 
          flexGrow: 1, 
          p: { xs: 2, sm: 3 }, 
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          pb: isMobile ? 8 : 3 // Добавляем отступ снизу для мобильных устройств
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" disableGutters>
          {children}
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
            overflow: 'hidden'
          }} 
          elevation={3}
        >
          <BottomNavigation
            value={getNavValue()}
            onChange={(event, newValue) => {
              switch(newValue) {
                case 0:
                  navigate('/');
                  break;
                case 1:
                  navigate('/tickets');
                  break;
                case 2:
                  navigate('/profile');
                  break;
                case 3:
                  navigate('/settings');
                  break;
                default:
                  break;
              }
            }}
            showLabels
          >
            <BottomNavigationAction label="Главная" icon={<DashboardIcon />} />
            <BottomNavigationAction label="Заявки" icon={<ConfirmationNumberIcon />} />
            <BottomNavigationAction label="Профиль" icon={<PersonIcon />} />
            <BottomNavigationAction label="Настройки" icon={<SettingsIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default Layout; 