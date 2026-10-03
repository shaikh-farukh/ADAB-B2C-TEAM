import apiClient, { handleApiError } from './apiClient';

export interface VehicleRoute {
  id: number;
  owner_id?: number;
  vehicle_id?: number;
  route_name: string;
  source_location?: string;
  destination_location?: string;
  waypoints?: any[];
  estimated_distance_km?: number;
  estimated_time_hours?: number;
  status?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  driver_name?: string;
  created_at?: string;
}

export const vehicleRouteService = {
  async getRoutes(params?: { vehicle_id?: number; status?: string }) {
    try {
      const response = await apiClient.get('/vehicle-routes', { params });
      return { success: true as const, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch vehicle routes.');
    }
  },

  async getRouteById(id: number | string) {
    try {
      const response = await apiClient.get(`/vehicle-routes/${id}`);
      return { success: true as const, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch vehicle route.');
    }
  },

  async createRoute(data: Partial<VehicleRoute>) {
    try {
      const response = await apiClient.post('/vehicle-routes', data);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create vehicle route.');
    }
  },

  async updateRoute(id: number | string, data: Partial<VehicleRoute>) {
    try {
      const response = await apiClient.put(`/vehicle-routes/${id}`, data);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update vehicle route.');
    }
  },

  async deleteRoute(id: number | string) {
    try {
      const response = await apiClient.delete(`/vehicle-routes/${id}`);
      return { success: true as const, message: response.data.message };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete vehicle route.');
    }
  },

  async assignVehicleToRoute(payload: { vehicle_id: number; route_id?: number; order_id?: number; driver_id?: number }) {
    try {
      const response = await apiClient.post('/vehicle-routes/assign-vehicle', payload);
      return { success: true as const, message: response.data.message, data: response.data.data };
    } catch (error: any) {
      return handleApiError(error, 'Failed to assign vehicle to route.');
    }
  }
};
