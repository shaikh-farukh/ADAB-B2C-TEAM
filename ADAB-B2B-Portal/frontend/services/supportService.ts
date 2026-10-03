import apiClient from './apiClient';

const supportService = {
  submitContact: async (payload: { name: string; email: string; phone?: string; message: string }) => {
    const response = await apiClient.post('/contact', payload);
    return response.data;
  },

  getIssueTypes: async () => {
    const response = await apiClient.get('/support/issue-types');
    return response.data;
  },

  createTicket: async (payload: { issue_type: string; subject: string; description: string; attachment?: string }) => {
    const response = await apiClient.post('/support', payload);
    return response.data;
  },

  getTickets: async () => {
    const response = await apiClient.get('/support');
    return response.data;
  },

  getTicketById: async (id: string | number) => {
    const response = await apiClient.get(`/support/${id}`);
    return response.data;
  }
};

export default supportService;
