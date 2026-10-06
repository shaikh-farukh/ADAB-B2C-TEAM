import apiClient from './apiClient';

/**
 * Responsibility: Manufacturer-specific partnership request API wrapper.
 * Interface strictly follows the B2B Backend contract for managing distributor applications.
 */
const requestService = {
  /**
   * Fetches all partnership requests received from distributors.
   * Supports server-side search by distributor name and filtering by status.
   */
  getReceivedRequests: async (params?: { search?: string; status?: string }) => {
    try {
      const response = await apiClient.get('/manufacturers/requests', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetches detailed information for a specific request.
   */
  getRequestDetails: async (id: number | string) => {
    try {
      const response = await apiClient.get(`/manufacturers/requests/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Sends a connection request to a distributor.
   */
  sendConnectionRequest: async (data: { distributor_id: number; description?: string }) => {
    try {
      const response = await apiClient.post('/manufacturers/requests', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Accepts a specific partnership request by ID using PATCH.
   */
  acceptRequest: async (id: number) => {
    try {
      const response = await apiClient.patch(`/manufacturers/requests/${id}/accept`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Rejects a specific partnership request by ID using PATCH.
   */
  rejectRequest: async (id: number) => {
    try {
      const response = await apiClient.patch(`/manufacturers/requests/${id}/reject`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * FOR MANUFACTURERS (Day 2):
   * Submits a counter-offer price for an RFQ request.
   */
  counterOfferRFQ: async (id: number | string, data: { counter_price: number; notes?: string; deadline?: string }) => {
    try {
      const response = await apiClient.put(`/manufacturers/requests/${id}/counter`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default requestService;
