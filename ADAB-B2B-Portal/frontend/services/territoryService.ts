import apiClient from './apiClient';

const territoryService = {
  assignTerritory: async (payload: { distributor_id: number; state_id?: number | null; city_id?: number | null; pincode?: string }) => {
    try {
      const response = await apiClient.post('/manufacturers/distributors/territories', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getTerritories: async () => {
    try {
      const response = await apiClient.get('/manufacturers/distributors/territories');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteTerritory: async (id: number | string) => {
    try {
      const response = await apiClient.delete(`/manufacturers/distributors/territories/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default territoryService;
