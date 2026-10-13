import api from './api';

const listingService = {
  getListings: (filters) => {
    return api.get('/seller/listings', {
      params: filters
    });
  },
  
  getListingById: (id) => {
    return api.get(`/seller/listings/${id}`);
  },

  getCategories: () => {
    return api.get('/seller/listings/categories');
  },

  createListing: (data) => {
    return api.post('/seller/listings', data);
  },

  updateListing: (id, data) => {
    return api.patch(`/seller/listings/${id}`, data);
  },

  deleteListing: (id) => {
    return api.delete(`/seller/listings/${id}`);
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
