import apiClient from './apiClient';

/**
 * Responsibility: Manufacturer Product API wrapper.
 * Interface strictly follows the B2B Backend contract for /manufacturers/products.
 */
const productService = {
  /**
   * Uploads image directly to MinIO storage.
   */
  uploadImage: async (file: File, folder: string = 'products') => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/uploads/image?folder=${folder}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Fetches all products for the current manufacturer.
   * Supports optional filters for status, category, page, limit.
   */
  getProducts: async (filters?: { status?: string; category?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/manufacturers/products', { params: filters });
    return response.data;
  },

  /**
   * Fetches specific product by ID.
   */
  getProductById: async (id: string) => {
    const response = await apiClient.get(`/manufacturers/products/${id}`);
    return response.data;
  },

  /**
   * Fetches product-related statistics for the dashboard.
   */
  getProductStats: async () => {
    const response = await apiClient.get('/manufacturers/products/stats');
    return response.data;
  },

  /**
   * Creates a new product.
   */
  addProduct: async (payload: any) => {
    const response = await apiClient.post('/manufacturers/products', payload);
    return response.data;
  },

  /**
   * Updates an existing product.
   * Note: Backend requires only changed fields.
   */
  updateProduct: async (id: string, payload: any) => {
    const response = await apiClient.put(`/manufacturers/products/${id}`, payload);
    return response.data;
  },

  /**
   * Deletes a product.
   */
  deleteProduct: async (id: string) => {
    const response = await apiClient.delete(`/manufacturers/products/${id}`);
    return response.data;
  },

  /**
   * Toggles product visibility/status.
   */
  toggleStatus: async (id: string, status: 'active' | 'inactive') => {
    const response = await apiClient.patch(`/manufacturers/products/${id}/status`, { status });
    return response.data;
  },

  /**
   * Fetches warehouse stock allocation for a product.
   */
  getWarehouseStock: async (id: string) => {
    const response = await apiClient.get(`/manufacturers/products/${id}/warehouses`);
    return response.data;
  },

  /**
   * Updates multi-warehouse stock allocation (North, South, Central hubs).
   */
  updateWarehouseStock: async (id: string, payload: { north_hub: number; south_hub: number; central_hub: number }) => {
    const response = await apiClient.put(`/manufacturers/products/${id}/warehouses`, payload);
    return response.data;
  },

  /**
   * Bulk export products as CSV.
   * Uses blob responseType to handle file download properly.
   */
  bulkExportProducts: async () => {
    const response = await apiClient.get('/manufacturers/products/bulk-export', {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default productService;