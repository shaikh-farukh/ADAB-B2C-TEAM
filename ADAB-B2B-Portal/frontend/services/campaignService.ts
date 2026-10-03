import apiClient from './apiClient';

const campaignService = {
  createCampaign: async (payload: {
    campaign_name: string;
    message: string;
    notification_type: 'New Product' | 'Offer' | 'Stock Arrival' | 'Price Update';
    targeting_type?: 'all' | 'territory' | 'cities' | 'shops';
    targeting_values?: Array<number | string> | null;
  }) => {
    try {
      const response = await apiClient.post('/campaigns', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCampaigns: async () => {
    try {
      const response = await apiClient.get('/campaigns');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default campaignService;
