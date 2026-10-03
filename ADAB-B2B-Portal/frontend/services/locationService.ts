import apiClient from './apiClient';

export interface StateOption {
  id: number;
  state_name: string;
}

export interface CityOption {
  id: number;
  city_name: string;
}

const locationService = {
  getStates: async () => {
    const response = await apiClient.get('/locations/states');
    return response.data;
  },

  getCities: async (stateId?: number | string) => {
    const response = await apiClient.get('/locations/cities', {
      params: stateId ? { state_id: stateId } : undefined
    });
    return response.data;
  }
};

export default locationService;
