import apiClient from './apiClient';

const categoryService = {
  getCategories: async () => {
    const response = await apiClient.get('/manufacturers/categories');
    return response.data;
  },

  getCategoryById: async (id: string | number) => {
    const response = await apiClient.get(`/manufacturers/categories/${id}`);
    return response.data;
  },

  createCategory: async (payload: { category_name: string; description?: string }) => {
    const response = await apiClient.post('/manufacturers/categories', payload);
    return response.data;
  },

  getSubcategories: async (categoryId: string | number) => {
    const response = await apiClient.get(`/manufacturers/categories/${categoryId}/subcategories`);
    return response.data;
  },

  createSubcategory: async (
    categoryId: string | number,
    payload: { subcategory_name: string; description?: string }
  ) => {
    const response = await apiClient.post(`/manufacturers/categories/${categoryId}/subcategories`, payload);
    return response.data;
  },

  updateCategory: async (id: string | number, payload: { category_name?: string; description?: string; active?: boolean }) => {
    const response = await apiClient.put(`/manufacturers/categories/${id}`, payload);
    return response.data;
  },

  deleteCategory: async (id: string | number) => {
    const response = await apiClient.delete(`/manufacturers/categories/${id}`);
    return response.data;
  },

  updateSubcategory: async (id: string | number, payload: { subcategory_name?: string; description?: string; active?: boolean }) => {
    const response = await apiClient.put(`/manufacturers/subcategories/${id}`, payload);
    return response.data;
  },

  deleteSubcategory: async (id: string | number) => {
    const response = await apiClient.delete(`/manufacturers/subcategories/${id}`);
    return response.data;
  }
};

export default categoryService;
