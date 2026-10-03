import apiClient, { handleApiError } from './apiClient';
/**
 * Responsibility: Manufacturer-Distributor management API wrapper.
 * Interface strictly follows the B2B Backend contract for managing the partner ecosystem.
 */
const distributorService = {
  /**
   * FOR MANUFACTURERS:
   * Fetches all approved distributors for the current manufacturer.
   */
  getAllDistributors: async (params?: { search?: string; region?: string }) => {
    const response = await apiClient.get('/manufacturers/distributors', { params });
    return response.data;
  },

  /**
   * FOR MANUFACTURERS:
   * Fetch all unique countries/regions where active distributors exist.
   */
  getDistributorRegions: async () => {
    const response = await apiClient.get('/manufacturers/distributors/regions');
    return response.data;
  },

  /**
   * FOR MANUFACTURERS:
   * Fetches full profile details for a specific distributor by ID.
   */
  getDistributorById: async (id: string | number) => {
    const response = await apiClient.get(`/manufacturers/distributors/${id}`);
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS:
   * Get list of all manufacturers to browse and send requests.
   */
  getAvailableManufacturers: async (params?: { search?: string; category?: string }) => {
    const response = await apiClient.get('/distributors/manufacturers', { params });
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS:
   * Get all unique product categories for filtering manufacturers.
   */
  getManufacturerCategories: async () => {
    const response = await apiClient.get('/distributors/manufacturers/categories');
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS:
   * Get detailed profile of a specific manufacturer.
   */
  getManufacturerById: async (id: string | number) => {
    const response = await apiClient.get(`/distributors/manufacturers/${id}`);
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS:
   * Send partnership request to a manufacturer. (Deprecated/Blocked)
   */
  sendPartnershipRequest: async (payload: { manufacturer_id: number; name: string; description: string }) => {
    const response = await apiClient.post('/distributors/requests', payload);
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS (Day 2):
   * Create an RFQ quotation request with target price and deadline.
   */
  createRFQ: async (payload: {
    manufacturer_id: number;
    target_price: number;
    quantity?: number;
    product_id?: number;
    product_name?: string;
    description?: string;
    deadline?: string;
  }) => {
    const response = await apiClient.post('/distributors/requests', {
      ...payload,
      request_type: 'RFQ'
    });
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS (Day 2):
   * Accept or reject a quote / counter-offer.
   */
  respondRFQ: async (id: number | string, action: 'ACCEPT' | 'REJECT', notes?: string) => {
    const response = await apiClient.post(`/distributors/requests/${id}/respond`, {
      action,
      notes
    });
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS:
   * Accept incoming connection request from a manufacturer.
   */
  acceptConnectionRequest: async (id: number | string) => {
    const response = await apiClient.patch(`/distributors/requests/${id}/accept`);
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS:
   * Reject incoming connection request from a manufacturer.
   */
  rejectConnectionRequest: async (id: number | string) => {
    const response = await apiClient.patch(`/distributors/requests/${id}/reject`);
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS:
   * Get all requests sent by distributor with their status.
   */
  getRequestStatus: async () => {
    const response = await apiClient.get('/distributors/requests/my-status');
    return response.data;
  },

  /**
   * FOR DISTRIBUTORS:
   * Get detailed information about a specific request.
   */
  getRequestDetails: async (id: number | string) => {
    const response = await apiClient.get(`/distributors/requests/${id}`);
    return response.data;
  },

  /**
   * PROCUREMENT APIs
   */

  /**
   * Get all products from approved manufacturers with server-side pagination.
   */
  getCatalog: async (params?: { search?: string; category?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/distributors/catalog', { params });
    return response.data;
  },

  /**
   * Get unique categories from the product catalog.
   */
  getCatalogCategories: async () => {
    const response = await apiClient.get('/distributors/catalog/categories');
    return response.data;
  },

  /**
   * Get details for a specific catalog product.
   */
  getProductDetails: async (id: string | number) => {
    const response = await apiClient.get(`/distributors/catalog/${id}`);
    return response.data;
  },

  /**
   * Cart Management
   */
  addToCart: async (payload: { product_id: number; quantity: number }) => {
    const response = await apiClient.post('/distributors/cart', payload);
    return response.data;
  },

  getCart: async () => {
    const response = await apiClient.get('/distributors/cart');
    return response.data;
  },

  updateCartItem: async (id: string | number, quantity: number) => {
    const response = await apiClient.put(`/distributors/cart/${id}`, { quantity });
    return response.data;
  },

  removeFromCart: async (id: string | number) => {
    const response = await apiClient.delete(`/distributors/cart/${id}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await apiClient.delete('/distributors/cart');
    return response.data;
  },

  /**
   * Order Placement
   */
  placeOrder: async (payload: { shipping_address: string; delivery_mode: 'SELF' | 'THIRD_PARTY' | 'DISTRIBUTOR_BULK' | string; payment_mode: 'CASH' | 'NET_30' | string; delivery_charge?: number }) => {
    const response = await apiClient.post('/distributors/orders', payload);
    return response.data;
  },

  /**
   * Order History
   */
  /**
   * Retrieves tracking timeline events for an order.
   */
  getTimeline: async (id: string | number) => {
    try {
      const response = await apiClient.get(`/orders/${id}/timeline`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getOrders: async (params?: { status?: string; search?: string; category?: string; page?: number | string; limit?: number | string }) => {
    const response = await apiClient.get('/distributors/orders', { params });
    return response.data;
  },

  getOrderById: async (id: string | number) => {
    const response = await apiClient.get(`/distributors/orders/${id}`);
    return response.data;
  },

  getInvoice: async (id: string | number) => {
    const response = await apiClient.get(`/distributors/orders/${id}/invoices`);
    return response.data;
  },

  downloadInvoicePDF: async (id: string | number) => {
    const response = await apiClient.get(`/distributors/orders/${id}/invoices/pdf`, {
      responseType: 'blob'
    });
    return response.data;
  },

  /**
   * Dashboard Analytics
   */
  getDashboardStats: async () => {
    const response = await apiClient.get('/distributors/dashboard');
    return response.data;
  },

  getDashboardMetrics: async () => {
    const response = await apiClient.get('/distributors/dashboard');
    return response.data;
  },

  getHealthScan: async () => {
    const response = await apiClient.get('/distributors/dashboard/health');
    return response.data;
  },

  getNetworkHealth: async () => {
    const response = await apiClient.get('/distributors/dashboard/health');
    return response.data;
  },

  getAnalyticsTrend: async () => {
    try {
      const response = await apiClient.get('/distributors/dashboard');
      return { 
        success: true, 
        data: {
          revenue_trend: response.data?.data?.volume_analysis || [],
          top_categories: response.data?.data?.top_categories || []
        }
      };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch analytics trend.');
    }
  },

  getSmartReorders: async () => {
    try {
      // The backend actually returns smart_reorder data in the main dashboard endpoint
      const response = await apiClient.get('/distributors/dashboard');
      return { success: true, data: response.data?.data?.smart_reorder || [] };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch smart reorders.');
    }
  },

  /**
   * RAZORPAY INTEGRATION
   */

  createRazorpayCheckout: async (orderIds: number[]) => {
    const response = await apiClient.post('/payments/razorpay/create-order', { orderIds: orderIds });
    return response.data;
  },

  verifyRazorpayPayment: async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    checkout_id: number;
  }) => {
    const response = await apiClient.post('/payments/razorpay/verify', payload);
    return response.data;
  }
};

export default distributorService;
