import apiClient from './apiClient';

const mapService = {
  getMarketCoverage: async (params?: {
    business_type?: 'manufacturer' | 'distributor' | 'shop';
    state_id?: string;
    city_id?: string;
    pincode?: string;
    category?: string;
  }) => {
    try {
      const response = await apiClient.get('/market-coverage', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default mapService;
