import apiClient from './apiClient';

/**
 * Responsibility: API wrapper for distributor managing incoming shop orders.
 */
const distributorShopOrderService = {
  getShopOrders: async (status?: string) => {
    try {
      const response = await apiClient.get('/distributors/shop-orders', {
        params: status ? { status } : {}
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getShopOrderDetail: async (id: number | string) => {
    try {
      const response = await apiClient.get(`/distributors/shop-orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  acceptOrder: async (id: number | string, notes?: string) => {
    try {
      const response = await apiClient.patch(`/distributors/shop-orders/${id}/accept`, { notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectOrder: async (id: number | string, notes?: string) => {
    try {
      const response = await apiClient.patch(`/distributors/shop-orders/${id}/reject`, { notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  startProcessing: async (id: number | string, notes?: string) => {
    try {
      const response = await apiClient.patch(`/distributors/shop-orders/${id}/start-processing`, { notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  markPacked: async (id: number | string, notes?: string) => {
    try {
      const response = await apiClient.patch(`/distributors/shop-orders/${id}/mark-packed`, { notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  dispatchOrder: async (id: number | string, payload: { transporter_name?: string; vehicle_number?: string; tracking_number?: string; notes?: string }) => {
    try {
      const response = await apiClient.patch(`/distributors/shop-orders/${id}/dispatch`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  markDelivered: async (id: number | string, notes?: string) => {
    try {
      const response = await apiClient.patch(`/distributors/shop-orders/${id}/mark-delivered`, { notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default distributorShopOrderService;
