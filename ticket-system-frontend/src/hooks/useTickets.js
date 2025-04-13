import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../api/api';

export const useTickets = (filters = {}) => {
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ['tickets', filters],
    queryFn: () => ticketsAPI.getAll(filters),
    select: (data) => data.data || [],
    onError: (error) => {
      console.error('Error fetching tickets:', error);
      return [];
    }
  });

  const ticketMutation = useMutation({
    mutationFn: ticketsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error creating ticket:', error);
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ id, data }) => ticketsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error updating ticket:', error);
    }
  });

  const deleteTicketMutation = useMutation({
    mutationFn: ticketsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error deleting ticket:', error);
    }
  });

  const assignTicketMutation = useMutation({
    mutationFn: ({ ticketId, agentId }) => ticketsAPI.assign(ticketId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error assigning ticket:', error);
    }
  });

  const selfAssignTicketMutation = useMutation({
    mutationFn: (ticketId) => ticketsAPI.selfAssign(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error self-assigning ticket:', error);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }) => ticketsAPI.updateStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error updating ticket status:', error);
    }
  });

  const closeTicketMutation = useMutation({
    mutationFn: (ticketId) => ticketsAPI.closeTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error closing ticket:', error);
    }
  });

  const reopenTicketMutation = useMutation({
    mutationFn: (ticketId) => ticketsAPI.reopenTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (error) => {
      console.error('Error reopening ticket:', error);
    }
  });

  return {
    tickets: ticketsQuery.data || [],
    isLoading: ticketsQuery.isLoading,
    isError: ticketsQuery.isError,
    error: ticketsQuery.error,
    createTicket: ticketMutation.mutate,
    updateTicket: updateTicketMutation.mutate,
    deleteTicket: deleteTicketMutation.mutate,
    assignTicket: assignTicketMutation.mutate,
    selfAssignTicket: selfAssignTicketMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    closeTicket: closeTicketMutation.mutate,
    reopenTicket: reopenTicketMutation.mutate,
  };
};

export const useTicket = (ticketId) => {
  const queryClient = useQueryClient();
  
  const ticketQuery = useQuery({
    queryKey: ['tickets', ticketId],
    queryFn: () => ticketsAPI.getById(ticketId),
    select: (data) => data.data || null,
    enabled: !!ticketId,
    onError: (error) => {
      console.error(`Error fetching ticket ${ticketId}:`, error);
      return null;
    }
  });

  const commentQuery = useQuery({
    queryKey: ['tickets', ticketId, 'comments'],
    queryFn: () => ticketsAPI.getComments(ticketId),
    select: (data) => data.data || [],
    enabled: !!ticketId,
    onError: (error) => {
      console.error(`Error fetching comments for ticket ${ticketId}:`, error);
      return [];
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: (commentData) => ticketsAPI.addComment(ticketId, commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', ticketId, 'comments'] });
    },
    onError: (error) => {
      console.error(`Error adding comment to ticket ${ticketId}:`, error);
    }
  });

  return {
    ticket: ticketQuery.data,
    comments: commentQuery.data || [],
    isLoading: ticketQuery.isLoading || commentQuery.isLoading,
    isError: ticketQuery.isError || commentQuery.isError,
    error: ticketQuery.error || commentQuery.error,
    addComment: addCommentMutation.mutate,
  };
}; 