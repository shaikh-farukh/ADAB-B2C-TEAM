import client from './client';

const storeId = '00000000-0000-0000-0000-000000000001'; // Mock store ID for testing

const getHeaders = () => ({ 'x-store-id': storeId });

export const listingApi = {
  fetchListings: (filters) => {
    return client.get('/listings', {
      params: filters,
      headers: getHeaders()
    });
  },
  
  fetchListingById: (id) => {
    return client.get(`/listings/${id}`, {
      headers: getHeaders()
    });
  },

  createListing: (data) => {
    return client.post('/listings', data, {
      headers: getHeaders()
    });
  },

  updateListing: (id, data) => {
    return client.put(`/listings/${id}`, data, {
      headers: getHeaders()
    });
  },

  deleteListing: (id) => {
    return client.delete(`/listings/${id}`, {
      headers: getHeaders()
    });
  },

  submitListing: (id) => {
    return client.post(`/listings/${id}/submit`, {}, {
      headers: getHeaders()
    });
  },
  
  adminStartReview: (id) => {
    return client.post(`/listings/${id}/admin-start-review`, {}, {
      headers: getHeaders()
    });
  },

  adminReviewListing: (id, data) => {
    return client.post(`/listings/${id}/admin-review`, data, {
      headers: getHeaders()
    });
  },
  
  publishListing: (id) => {
    return client.post(`/listings/${id}/publish`, {}, {
      headers: getHeaders()
    });
  },

  bulkUpload: (formData) => {
    return client.post('/listings/bulk-upload', formData, {
      headers: {
        ...getHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  checkUploadStatus: (jobId) => {
    return client.get(`/listings/bulk-upload/${jobId}/status`, {
      headers: getHeaders()
    });
  }
};
