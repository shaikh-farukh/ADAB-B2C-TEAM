import apiClient, { handleApiError } from './apiClient';

export interface LogisticsProvider {
  id: string;
  provider_name: string;
  contact_person: string;
  mobile: string;
  email: string;
  address: string;
  gst_number: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export const logisticsService = {
  async getProviders() {
    try {
      const response = await apiClient.get('/logistics-providers');
      return { success: true as const, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getProviderById(id: string) {
    try {
      const response = await apiClient.get(`/logistics-providers/${id}`);
      return { success: true as const, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async createProvider(data: Partial<LogisticsProvider>) {
    try {
      const response = await apiClient.post('/logistics-providers', data);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async updateProvider(id: string, data: Partial<LogisticsProvider>) {
    try {
      const response = await apiClient.put(`/logistics-providers/${id}`, data);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async toggleStatus(id: string, status: 'active' | 'inactive') {
    try {
      const response = await apiClient.patch(`/logistics-providers/${id}/status`, { status });
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async deleteProvider(id: string) {
    try {
      const response = await apiClient.delete(`/logistics-providers/${id}`);
      return { success: true as const, message: response.data.message };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  }
};
