import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Box, CircularProgress, Typography } from '@mui/material';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeModeProvider } from './context/ThemeContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AgentDashboardPage from './pages/AgentDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import TicketsPage from './pages/TicketsPage';
import ProfilePage from './pages/ProfilePage';
import CreateTicketPage from './pages/CreateTicketPage';
import CategoryManagementPage from './pages/CategoryManagementPage';
import TicketDetailsPage from './pages/TicketDetailsPage';
import ManageUsersPage from './pages/ManageUsersPage';

// Components
import Layout from './components/Layout';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Dashboard Router - отображает соответствующий дашборд в зависимости от роли пользователя
const DashboardRouter = () => {
  const { user, loading } = useAuth();
  
  // Добавляем проверку загрузки
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>Загрузка данных пользователя...</Typography>
      </Box>
    );
  }
  
  // Проверяем наличие пользователя
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Если пользователь - администратор, отображаем панель администратора
  if (user?.role === 'admin') {
    return <AdminDashboardPage />;
  }
  
  // Если пользователь - агент, отображаем агентский дашборд
  if (user?.role === 'agent') {
    return <AgentDashboardPage />;
  }
  
  // Для обычных пользователей отображаем стандартный дашборд
  return <DashboardPage />;
};

function App() {
  return (
    <ThemeModeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardRouter />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tickets" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TicketsPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tickets/new" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CreateTicketPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tickets/:id" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <TicketDetailsPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ProfilePage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      {/* We'll implement this page later */}
                      <div>Settings (Coming Soon)</div>
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/category-management" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CategoryManagementPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/manage-users" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ManageUsersPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeModeProvider>
  );
}

export default App;
