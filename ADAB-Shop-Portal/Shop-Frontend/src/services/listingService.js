import api from './api';

// In-memory cache for static catalog metadata (categories & tree)
const staticCache = new Map();

const listingService = {
  getListings: (filters) => {
    return api.get('/seller/listings', {
      params: filters
    });
  },
  
  getListingById: (id) => {
    return api.get(`/seller/listings/${id}/product-details`);
  },

  getCategories: async () => {
    const cached = staticCache.get('categories');
    if (cached && Date.now() - cached.time < 300000) {
      return cached.data;
    }
    const data = await api.get('/seller/listings/categories');
    staticCache.set('categories', { data, time: Date.now() });
    return data;
  },

  getCategoryTree: async () => {
    const cached = staticCache.get('categoryTree');
    if (cached && Date.now() - cached.time < 300000) {
      return cached.data;
    }
    const data = await api.get('/shop/catalog/categories/category-tree');
    staticCache.set('categoryTree', { data, time: Date.now() });
    return data;
  },

  getCategoryAttributes: (categoryId) => {
    return api.get(`/shop/catalog/categories/${categoryId}/attributes`);
  },

  searchMasterCatalog: (q) => {
    return api.get('/shop/catalog/master/search', { params: { q } });
  },

  getB2BProducts: (q) => {
    return api.get('/shop/catalog/b2b/products', { params: { q } });
  },

  lookupBarcode: (barcode) => {
    return api.get(`/shop/catalog/barcode/${encodeURIComponent(barcode)}/lookup-barcode`);
  },

  createListing: (data) => {
    return api.post('/seller/listings', data);
  },

  updateListing: (id, data) => {
    return api.patch(`/seller/listings/${id}/update-listing`, data);
  },

  deleteListing: (id) => {
    return api.delete(`/seller/listings/${id}/delete-listing`);
  },

  batchDeleteListings: (ids) => {
    return api.post('/seller/listings/batch-delete', { ids });
  },

  submitListing: (id) => {
    return api.post(`/seller/listings/${id}/submit`, {});
  },
  
  adminStartReview: (id) => {
    return api.post(`/seller/listings/${id}/admin-start-review`, {});
  },

  adminReviewListing: (id, data) => {
    return api.post(`/seller/listings/${id}/admin-review`, data);
  },
  
  publishListing: (id) => {
    return api.post(`/seller/listings/${id}/publish`, {});
  },

  getListingIssues: (id) => {
    return api.get(`/seller/listings/${id}/issues`);
  },

  bulkExport: () => {
    return api.post('/seller/listings/bulk-export', {});
  },
  
  getBulkExportStatus: (jobId) => {
    return api.get(`/seller/listings/bulk-export/${jobId}/status`);
  }
};

export default listingService;
