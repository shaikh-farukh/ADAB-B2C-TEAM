import client from './client';

export const pricingApi = {
  fetchPricing: () => client.get('/pricing'),
  updateBulkPricing: (updates) => client.post('/pricing/bulk', { updates }),
  updateListingPricing: (listingId, data) => client.patch(`/pricing/${listingId}`, data),
  getPricingHistory: () => client.get('/pricing/history'),
  previewPricing: (listingId) => client.get(`/pricing/${listingId}/preview`),
  schedulePricing: (listingId, data) => client.post(`/pricing/${listingId}/schedule`, data),
  deleteSchedule: (listingId) => client.delete(`/pricing/${listingId}/schedule`)
};
