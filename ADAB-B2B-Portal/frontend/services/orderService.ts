import apiClient from './apiClient';

/**
 * Responsibility: Manufacturer-side Order Management API wrapper.
 * Interface strictly follows the B2B Backend contract for order lifecycle.
 */
const orderService = {
  /**
   * Fetches all purchase orders received by the manufacturer.
   * Supports filtering by status, distributor, and date range.
   */
  getOrders: async (params?: {
    status?: string;
    distributor_id?: number | string;
    start_date?: string;
    end_date?: string;
    category?: string;
    search?: string;
    page?: number | string;
    limit?: number | string;
  }) => {
    try {
      const response = await apiClient.get('/manufacturers/orders', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetches full order details including line items and distributor contact info.
   */
  getOrderById: async (id: string | number) => {
    try {
      const response = await apiClient.get(`/manufacturers/orders/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetches high-level metrics for the dashboard widgets.
   */
  getOrderStats: async () => {
    try {
      const response = await apiClient.get('/manufacturers/orders/summary');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Updates general order status with optional audit notes.
   */
  updateOrderStatus: async (id: string | number, payload: { status: string; notes?: string }) => {
    try {
      const response = await apiClient.patch(`/manufacturers/orders/${id}/status`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Marks order as accepted and ready for processing.
   */
  acceptOrder: async (id: string | number, payload: { notes?: string }) => {
    try {
      const response = await apiClient.patch(`/manufacturers/orders/${id}/accept`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Transitions order from accepted to processing state.
   */
  startProcessing: async (id: string | number, payload: { notes?: string }) => {
    try {
      const response = await apiClient.patch(`/manufacturers/orders/${id}/start-processing`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Marks order as ready for dispatch.
   */
  markReadyForDispatch: async (id: string | number, payload: { notes?: string; delivery_partner?: string }) => {
    try {
      const response = await apiClient.patch(`/manufacturers/orders/${id}/ready-for-dispatch`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Dispatches order with transporter and tracking information.
   */
  dispatchOrder: async (id: string | number, payload: { transporter_name: string; vehicle_number: string; tracking_number: string; dispatch_date: string; notes?: string }) => {
    try {
      const response = await apiClient.patch(`/manufacturers/orders/${id}/dispatch`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Marks order as dispatched.
   */
  shipOrder: async (id: string | number, payload: { tracking_number: string; shipping_provider: string; notes?: string }) => {
    try {
      const response = await apiClient.patch(`/manufacturers/orders/${id}/ship`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Marks order as out for delivery.
   */
  outForDelivery: async (id: string | number) => {
    try {
      const response = await apiClient.post(`/orders/${id}/out-for-delivery`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Submits Proof of Delivery and marks as delivered.
   */
  submitProofOfDelivery: async (id: string | number, payload: { pod_photo?: string, pod_signature?: string, pod_notes?: string }) => {
    try {
      const response = await apiClient.post(`/orders/${id}/proof-of-delivery`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Download Invoice PDF
   */
  downloadInvoice: async (orderId: string | number) => {
    try {
      const invRes = await apiClient.get(`/invoices?order_id=${orderId}`);
      if (invRes.data?.data && invRes.data.data.length > 0) {
        const invoiceId = invRes.data.data[0].id;
        const response = await apiClient.get(`/invoices/${invoiceId}/download`, { responseType: 'blob' });
        return response.data;
      }
      throw new Error('Invoice not found for this order');
    } catch (error) {
      throw error;
    }
  },

  /**
   * Upload POD image
   */
  uploadPODImage: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('pod_image', file);
      const response = await apiClient.post('/uploads/pod', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Cancels/Rejects a partnership request or order.
   */
  rejectOrder: async (id: string | number, payload: { rejection_reason: string }) => {
    try {
      const response = await apiClient.patch(`/manufacturers/orders/${id}/reject`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Fetches the audit trail for status changes and system events.
   */
  getOrderHistory: async (id: string | number) => {
    try {
      const response = await apiClient.get(`/manufacturers/orders/${id}/history`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Retrieves chronological order tracking timeline events.
   */
  getTimeline: async (id: string | number) => {
    try {
      const response = await apiClient.get(`/orders/${id}/timeline`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Retrieves official invoice reference data.
   */
  getInvoiceData: async (id: string | number) => {
    try {
      const response = await apiClient.get(`/manufacturers/orders/${id}/invoice`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Mark an order as delivered
   */
  markAsDelivered: async (id: string | number) => {
    try {
      const response = await apiClient.patch(`/manufacturers/orders/${id}/mark-delivered`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Download Invoice PDF
   */
  downloadInvoicePDF: async (id: string | number) => {
    try {
      const response = await apiClient.get(`/manufacturers/orders/${id}/invoice/pdf`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Assigns delivery (driver/vehicle) to an order.
   */
  assignDelivery: async (id: string | number, payload: { driver_id?: number | string; vehicle_id?: number | string }) => {
    try {
      const response = await apiClient.post(`/orders/${id}/assign-delivery`, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default orderService;