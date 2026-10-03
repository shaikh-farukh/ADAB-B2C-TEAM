import apiClient, { handleApiError } from './apiClient';

export interface Driver {
  id: string;
  logistics_provider_id: string | null;
  provider_name?: string;
  driver_name: string;
  mobile: string;
  license_number: string;
  license_expiry_date?: string;
  aadhaar_number?: string;
  emergency_contact?: string;
  is_available: boolean;
  status: 'active' | 'inactive';
  created_at?: string;
}

export const driverService = {
  async getDrivers(providerId?: string) {
    try {
      const url = providerId ? `/drivers?logistics_provider_id=${providerId}` : '/drivers';
      const response = await apiClient.get(url);
      return { success: true as const, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getDriverById(id: string) {
    try {
      const response = await apiClient.get(`/drivers/${id}`);
      return { success: true as const, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async createDriver(data: Partial<Driver>) {
    try {
      const response = await apiClient.post('/drivers', data);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async updateDriver(id: string, data: Partial<Driver>) {
    try {
      const response = await apiClient.put(`/drivers/${id}`, data);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async toggleStatus(id: string, payload: { status?: 'active' | 'inactive', is_available?: boolean }) {
    try {
      const response = await apiClient.patch(`/drivers/${id}/status`, payload);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async deleteDriver(id: string) {
    try {
      const response = await apiClient.delete(`/drivers/${id}`);
      return { success: true as const, message: response.data.message };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  }
};
