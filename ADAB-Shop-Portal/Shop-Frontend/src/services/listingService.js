import api from './api';

const getStoreHeaders = () => {
  const storeId = localStorage.getItem('seller_store_id');
  return storeId ? { 'x-store-id': storeId } : {};
};

const listingService = {
  getListings: (filters) => {
    return api.get('/seller/listings', {
      params: filters,
      headers: getStoreHeaders()
    });
  },
  
  getListingById: (id) => {
    return api.get(`/seller/listings/${id}`, {
      headers: getStoreHeaders()
    });
  },

  createListing: (data) => {
    return api.post('/seller/listings', data, {
      headers: getStoreHeaders()
    });
  },

  updateListing: (id, data) => {
    return api.patch(`/seller/listings/${id}`, data, {
      headers: getStoreHeaders()
    });
  },

  deleteListing: (id) => {
    return api.delete(`/seller/listings/${id}`, {
      headers: getStoreHeaders()
    });
  },

  submitListing: (id) => {
    return api.post(`/seller/listings/${id}/submit`, {}, {
      headers: getStoreHeaders()
    });
  },
  
  adminStartReview: (id) => {
    return api.post(`/seller/listings/${id}/admin-start-review`, {}, {
      headers: getStoreHeaders()
    });
  },

  adminReviewListing: (id, data) => {
    return api.post(`/seller/listings/${id}/admin-review`, data, {
      headers: getStoreHeaders()
    });
  },
  
  publishListing: (id) => {
    return api.post(`/seller/listings/${id}/publish`, {}, {
      headers: getStoreHeaders()
    });
  },

  getListingIssues: (id) => {
    return api.get(`/seller/listings/${id}/issues`, {
      headers: getStoreHeaders()
    });
  },

  bulkExport: () => {
    return api.post('/seller/listings/bulk-export', {}, {
      headers: getStoreHeaders()
    });
  },
  
  getBulkExportStatus: (jobId) => {
    return api.get(`/seller/listings/bulk-export/${jobId}/status`, {
      headers: getStoreHeaders()
    });
  }
};

export default listingService;
