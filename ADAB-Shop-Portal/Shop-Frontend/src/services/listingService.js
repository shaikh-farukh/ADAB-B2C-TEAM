import api from './api';

const storeId = '00000000-0000-0000-0000-000000000001'; // Mock store ID for testing

const listingService = {
  getListings: (filters) => {
    return api.get('/seller/listings', {
      params: filters,
      headers: { 'x-store-id': storeId }
    });
  },
  
  getListingById: (id) => {
    return api.get(`/seller/listings/${id}`, {
      headers: { 'x-store-id': storeId }
    });
  },

  createListing: (data) => {
    return api.post('/seller/listings', data, {
      headers: { 'x-store-id': storeId }
    });
  },

  updateListing: (id, data) => {
    return api.put(`/seller/listings/${id}`, data, {
      headers: { 'x-store-id': storeId }
    });
  },

  deleteListing: (id) => {
    return api.delete(`/seller/listings/${id}`, {
      headers: { 'x-store-id': storeId }
    });
  },

  submitListing: (id) => {
    return api.post(`/seller/listings/${id}/submit`, {}, {
      headers: { 'x-store-id': storeId }
    });
  },
  
  adminStartReview: (id) => {
    return api.post(`/seller/listings/${id}/admin-start-review`, {}, {
      headers: { 'x-store-id': storeId }
    });
  },

  adminReviewListing: (id, data) => {
    return api.post(`/seller/listings/${id}/admin-review`, data, {
      headers: { 'x-store-id': storeId }
    });
  },
  
  publishListing: (id) => {
    return api.post(`/seller/listings/${id}/publish`, {}, {
      headers: { 'x-store-id': storeId }
    });
  },

  getListingIssues: (id) => {
    return api.get(`/seller/listings/${id}/issues`, {
      headers: { 'x-store-id': storeId }
    }).catch(async () => {
      const { mockListingIssues } = await import('./day4Mocks');
      return new Promise(resolve => setTimeout(() => resolve(mockListingIssues), 500));
    });
  }
};

export default listingService;
