import { useEffect, useState } from 'react';
import { 
  Typography, Grid, Paper, Box, CircularProgress,
  Card, CardContent, CardHeader, Divider, Alert
} from '@mui/material';
import { useTickets } from '../hooks/useTickets';
import { useAuth } from '../context/AuthContext';
import { statisticsAPI } from '../api/api';
import { useQuery } from '@tanstack/react-query';

const statusColors = {
  'new': '#ffa726',
  'in_progress': '#29b6f6',
  'closed': '#66bb6a',
  'waiting_client': '#ef5350',
  'rejected': '#9e9e9e'
};

// Функция для форматирования статуса
const formatStatus = (status) => {
  const statusMap = {
    'new': 'Новая',
    'in_progress': 'В работе',
    'closed': 'Закрыта',
    'waiting_client': 'Ожидает клиента',
    'rejected': 'Отклонена'
  };
  return statusMap[status] || status;
};

const DashboardPage = () => {
  const { tickets, isLoading: isTicketsLoading, isError: isTicketsError } = useTickets();
  const { user } = useAuth();
  
  // Получаем статистику с сервера
  const { 
    data: statsData, 
    isLoading: isStatsLoading, 
    isError: isStatsError,
    error: statsError
  } = useQuery({
    queryKey: ['statistics', 'tickets-summary'],
    queryFn: statisticsAPI.getTicketStats,
    select: (response) => response.data,
    onError: (error) => {
      console.error('Error fetching statistics:', error);
    }
  });

  // Получаем статистику по периоду
  const {
    data: periodData,
    isLoading: isPeriodLoading
  } = useQuery({
    queryKey: ['statistics', 'tickets-by-period'],
    queryFn: () => statisticsAPI.getTicketsByPeriod('month'),
    select: (response) => response.data,
    onError: (error) => {
      console.error('Error fetching period statistics:', error);
    }
  });

  const isLoading = isTicketsLoading || isStatsLoading || isPeriodLoading;
  const isError = isTicketsError || isStatsError;

  const getErrorMessage = () => {
    if (statsError?.response?.data?.detail) {
      if (typeof statsError.response.data.detail === 'string') {
        return statsError.response.data.detail;
      }
    }
    return 'Ошибка загрузки данных. Пожалуйста, попробуйте позже.';
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {getErrorMessage()}
      </Alert>
    );
  }

  // Интегрируем данные статистики с данными билетов
  const stats = {
    total: statsData?.total_tickets || tickets.length,
    by_status: statsData?.status_distribution || {
      new: tickets.filter(ticket => ticket.status === 'new').length,
      in_progress: tickets.filter(ticket => ticket.status === 'in_progress').length,
      closed: tickets.filter(ticket => ticket.status === 'closed').length,
      waiting_client: tickets.filter(ticket => ticket.status === 'waiting_client').length,
      rejected: tickets.filter(ticket => ticket.status === 'rejected').length,
    },
    // Данные по пользователю получаем из списка тикетов 
    // так как статистика может не включать эту информацию
    assigned_to_me: tickets.filter(ticket => ticket.assigned_to_id === user?.id).length
  };

  // Проверяем наличие необходимых полей в объекте статистики
  const safeStats = {
    total: stats.total || 0,
    by_status: {
      new: stats.by_status?.new || 0,
      in_progress: stats.by_status?.in_progress || 0,
      closed: stats.by_status?.closed || 0,
      waiting_client: stats.by_status?.waiting_client || 0,
      rejected: stats.by_status?.rejected || 0,
    },
    assigned_to_me: stats.assigned_to_me || 0,
    // Данные по периодам
    period: periodData || {
      new_tickets: 0,
      resolved_tickets: 0,
      in_progress_tickets: 0,
      cancelled_tickets: 0
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Информационная панель
      </Typography>
      
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6">Всего заявок</Typography>
            <Typography variant="h3" sx={{ mt: 2 }}>{safeStats.total}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: statusColors.new }}>
            <Typography variant="h6" color="white">Новые заявки</Typography>
            <Typography variant="h3" color="white" sx={{ mt: 2 }}>{safeStats.by_status.new}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: statusColors.in_progress }}>
            <Typography variant="h6" color="white">В работе</Typography>
            <Typography variant="h3" color="white" sx={{ mt: 2 }}>{safeStats.by_status.in_progress}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: statusColors.closed }}>
            <Typography variant="h6" color="white">Закрытые заявки</Typography>
            <Typography variant="h3" color="white" sx={{ mt: 2 }}>{safeStats.by_status.closed}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%', bgcolor: statusColors.waiting_client }}>
            <Typography variant="h6" color="white">Ожидают клиента</Typography>
            <Typography variant="h3" color="white" sx={{ mt: 2 }}>{safeStats.by_status.waiting_client}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6">Назначено мне</Typography>
            <Typography variant="h3" sx={{ mt: 2 }}>{safeStats.assigned_to_me}</Typography>
          </Paper>
        </Grid>

        {/* Monthly Statistics */}
        {periodData && (
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Статистика за месяц" />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="h6">Новых заявок</Typography>
                      <Typography variant="h4">{safeStats.period.new_tickets}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="h6">Решено</Typography>
                      <Typography variant="h4">{safeStats.period.resolved_tickets}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="h6">В работе</Typography>
                      <Typography variant="h4">{safeStats.period.in_progress_tickets}</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="h6">Отменено</Typography>
                      <Typography variant="h4">{safeStats.period.cancelled_tickets}</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recent Tickets */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="Последние заявки" />
            <Divider />
            <CardContent>
              {tickets.length > 0 ? (
                <Grid container spacing={2}>
                  {tickets.slice(0, 5).map((ticket) => (
                    <Grid item xs={12} key={ticket.id}>
                      <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="h6">{ticket.title}</Typography>
                        <Typography variant="body2" color="textSecondary">
                          Статус: {formatStatus(ticket.status)} | 
                          Приоритет: {ticket.priority} | 
                          Создана: {new Date(ticket.created_at).toLocaleDateString()}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography>Заявок нет.</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage; 