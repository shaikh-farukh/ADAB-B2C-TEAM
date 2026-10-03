import apiClient from './apiClient';

const distributorInventoryService = {
  getInventory: async () => {
    try {
      const response = await apiClient.get('/distributors/inventory');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  publishProduct: async (payload: { product_id: number; price: number; stock_quantity: number; is_published: boolean }) => {
    try {
      const response = await apiClient.post('/distributors/inventory/publish', payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default distributorInventoryService;
