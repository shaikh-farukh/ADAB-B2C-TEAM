import apiClient, { handleApiError } from './apiClient';

export interface Vehicle {
  id: string;
  logistics_provider_id: string | null;
  provider_name?: string;
  driver_id: string | null;
  driver_name?: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity?: string;
  insurance_expiry_date?: string;
  permit_expiry_date?: string;
  is_available: boolean;
  status: 'active' | 'inactive';
  created_at?: string;
}

export const vehicleService = {
  async getVehicles(providerId?: string, driverId?: string, isAvailable?: string) {
    try {
      let url = '/vehicles?';
      if (providerId) url += `logistics_provider_id=${providerId}&`;
      if (driverId) url += `driver_id=${driverId}&`;
      if (isAvailable) url += `is_available=${isAvailable}`;

      const response = await apiClient.get(url);
      return { success: true as const, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async getVehicleById(id: string) {
    try {
      const response = await apiClient.get(`/vehicles/${id}`);
      return { success: true as const, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async createVehicle(data: Partial<Vehicle>) {
    try {
      const response = await apiClient.post('/vehicles', data);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async updateVehicle(id: string, data: Partial<Vehicle>) {
    try {
      const response = await apiClient.put(`/vehicles/${id}`, data);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async toggleStatus(id: string, payload: { status?: 'active' | 'inactive', is_available?: boolean }) {
    try {
      const response = await apiClient.patch(`/vehicles/${id}/status`, payload);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  },

  async deleteVehicle(id: string) {
    try {
      const response = await apiClient.delete(`/vehicles/${id}`);
      return { success: true as const, message: response.data.message };
    } catch (error: any) {
      return handleApiError(error, 'Failed to perform operation.');
    }
  }
};
