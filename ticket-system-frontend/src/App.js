import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeModeProvider } from './context/ThemeContext';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

// Страницы
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailsPage from './pages/TicketDetailsPage';
import CreateTicketPage from './pages/CreateTicketPage';
import ProfilePage from './pages/ProfilePage';
import ManageUsersPage from './pages/ManageUsersPage';
import EquipmentManagementPage from './pages/EquipmentManagementPage';
import AuditLogsPage from './pages/AuditLogsPage';

// Компоненты
import Layout from './components/Layout';

// Создаем клиент React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,  // 5 минут - базовое значение
      cacheTime: 30 * 60 * 1000, // 30 минут - общее время хранения в кэше
      networkMode: 'offlineFirst', // Предпочитать кэшированные данные при нестабильном соединении
    },
  },
});

// Защищенный маршрут
const ProtectedRoute = ({ requiredRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  console.log('ProtectedRoute проверка:', { 
    isAuthenticated, 
    loading, 
    userExists: !!user, 
    userRole: user?.role,
    requiredRoles 
  });

  // Если аутентификация еще проверяется, показываем загрузку
  // Но только если есть токен в localStorage
  if (loading && localStorage.getItem('token')) {
    console.log('Проверка аутентификации...');
    return <div>Loading...</div>;
  }

  // Если пользователь не аутентифицирован, перенаправляем на страницу входа
  if (!isAuthenticated) {
    console.log('Пользователь не аутентифицирован, перенаправление на /login');
    // Добавляем сообщение для страницы логина, если был токен, но аутентификация не прошла
    if (localStorage.getItem('token')) {
      sessionStorage.setItem('auth_error', 'Ваша сессия истекла. Пожалуйста, войдите снова.');
      localStorage.removeItem('token');
    }
    return <Navigate to="/login" replace />;
  }

  // Если требуются определенные роли и у пользователя нет нужной роли
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    console.log(`Требуемые роли: ${requiredRoles.join(', ')}, роль пользователя: ${user.role}`);
    
    // Перенаправляем на соответствующую страницу дашборда
    if (user.role === 'admin') {
      console.log('Перенаправление администратора на /admin');
      return <Navigate to="/admin" replace />;
    } else if (user.role === 'agent') {
      console.log('Перенаправление специалиста на /agent');
      return <Navigate to="/agent" replace />;
    } else {
      console.log('Перенаправление обычного пользователя на /');
      return <Navigate to="/" replace />;
    }
  }

  // Если все проверки пройдены, рендерим маршрут
  console.log('Доступ разрешен, отображение запрошенного маршрута');
  return <Outlet />;
};

// Компонент главной страницы, который отображает соответствующий дашборд в зависимости от роли
const MainPage = () => {
  const { user } = useAuth();
  
  if (user?.role === 'admin') {
    return <AdminDashboardPage />;
  } else if (user?.role === 'agent') {
    return <AgentDashboardPage />;
  } else {
    return <DashboardPage />;
  }
};

// Маршрутизация для авторизованных пользователей
const protectedRoutes = [
  {
    path: '/dashboard',
    element: <DashboardPage />
  },
  {
    path: '/tickets',
    element: <TicketsPage />
  },
  {
    path: '/tickets/:id',
    element: <TicketDetailsPage />
  },
  {
    path: '/create-ticket',
    element: <CreateTicketPage />
  },
  {
    path: '/users',
    element: <ManageUsersPage />,
    adminOnly: true  // Ограничение доступа только для админов
  },
  {
    path: '/audit-logs',
    element: <AuditLogsPage />,
    adminOnly: true  // Ограничение доступа только для админов - логи видны только админам
  }
];

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              {/* Публичные маршруты */}
              <Route path="/login" element={<LoginPage />} />

              {/* Маршруты, требующие аутентификации */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  {/* Главная страница отображает соответствующий дашборд в зависимости от роли */}
                  <Route path="/" element={<MainPage />} />
                  
                  {/* Заявки */}
                  <Route path="/tickets" element={<TicketsPage />} />
                  <Route path="/tickets/new" element={<CreateTicketPage />} />
                  <Route path="/tickets/:id" element={<TicketDetailsPage />} />
                  
                  {/* Профиль пользователя */}
                  <Route path="/profile" element={<ProfilePage />} />
                </Route>
              </Route>

              {/* Маршруты для администратора */}
              <Route element={<ProtectedRoute requiredRoles={['admin']} />}>
                <Route element={<Layout />}>
                  {/* Оставляем этот маршрут для совместимости, но он будет перенаправлять на главную */}
                  <Route path="/admin" element={<Navigate to="/" replace />} />
                  <Route path="/admin/users" element={<ManageUsersPage />} />
                  <Route path="/admin/categories" element={<Navigate to="/admin/equipment" replace />} />
                  <Route path="/admin/equipment" element={<EquipmentManagementPage />} />
                  <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                </Route>
              </Route>

              {/* Маршруты для технического специалиста */}
              <Route element={<ProtectedRoute requiredRoles={['agent']} />}>
                <Route element={<Layout />}>
                  {/* Оставляем этот маршрут для совместимости, но он будет перенаправлять на главную */}
                  <Route path="/agent" element={<Navigate to="/" replace />} />
                </Route>
              </Route>

              {/* Перенаправление неизвестных маршрутов */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}

export default App;
