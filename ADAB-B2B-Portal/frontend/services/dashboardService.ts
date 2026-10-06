import apiClient from './apiClient';

/**
 * Responsibility: Manufacturer Dashboard API wrapper.
 * Interface strictly follows the B2B Backend contract for dashboard analytics.
 */
const dashboardService = {
  /**
   * Fetch overview statistics (products, orders, distributors, requests, status chart)
   */
  getDashboardStats: async () => {
    const response = await apiClient.get('/manufacturers/dashboard');
    return response.data;
  },

  /**
   * Get breakdown of order statuses with counts, total amounts, and percentage ratios
   */
  getOrderSummary: async () => {
    const response = await apiClient.get('/manufacturers/dashboard/orders/summary');
    return response.data;
  },

  /**
   * Fetch facility efficiency metrics
   */
  getFacilityEfficiency: async () => {
    const response = await apiClient.get('/manufacturers/dashboard/efficiency');
    return response.data;
  }
};

export default dashboardService;
