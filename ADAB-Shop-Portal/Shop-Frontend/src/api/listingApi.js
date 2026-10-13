import client from './client';

export const listingApi = {
  fetchListings: (filters) => {
    return client.get('/listings', {
      params: filters
    });
  },
  
  fetchListingById: (id) => {
    return client.get(`/listings/${id}`);
  },

  createListing: (data) => {
    return client.post('/listings', data);
  },

  updateListing: (id, data) => {
    return client.patch(`/listings/${id}`, data);
  },

  deleteListing: (id) => {
    return client.delete(`/listings/${id}`);
  },

  submitListing: (id) => {
    return client.post(`/listings/${id}/submit`, {});
  },
  
  adminStartReview: (id) => {
    return client.post(`/listings/${id}/admin-start-review`, {});
  },

  adminReviewListing: (id, data) => {
    return client.post(`/listings/${id}/admin-review`, data);
  },
  
  publishListing: (id) => {
    return client.post(`/listings/${id}/publish`, {});
  },

  bulkUpload: (formData) => {
    return client.post('/listings/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  checkUploadStatus: (jobId) => {
    return client.get(`/listings/bulk-upload/${jobId}/status`);
  },

  uploadImage: (formData) => {
    return client.post('/listings/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  bulkExport: () => {
    return client.post('/listings/bulk-export', {}, {
      responseType: 'blob'
    });
  },

  checkExportStatus: (jobId) => {
    return client.get(`/listings/bulk-export/${jobId}/status`);
  }
};
