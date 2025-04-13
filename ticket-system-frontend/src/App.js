import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTheme, ThemeProvider } from '@mui/material';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TicketsPage from './pages/TicketsPage';
import ProfilePage from './pages/ProfilePage';
import CreateTicketPage from './pages/CreateTicketPage';
import CategoryManagementPage from './pages/CategoryManagementPage';

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

// Define theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
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

function App() {
  return (
    <ThemeProvider theme={theme}>
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
                      <DashboardPage />
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
                      {/* We'll implement this page later */}
                      <div>Ticket Details (Coming Soon)</div>
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
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
