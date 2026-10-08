import client from './client';

const storeId = '00000000-0000-0000-0000-000000000001';

const getHeaders = () => ({ 'x-store-id': storeId });

export const pricingApi = {
  fetchPricing: () => client.get('/pricing', { headers: getHeaders() }),
  updateBulkPricing: (updates) => client.post('/pricing/bulk', { updates }, { headers: getHeaders() }),
  updateListingPricing: (listingId, data) => client.patch(`/pricing/${listingId}`, data, { headers: getHeaders() }),
  getPricingHistory: () => client.get('/pricing/history', { headers: getHeaders() }),
  previewPricing: (listingId) => client.get(`/pricing/${listingId}/preview`, { headers: getHeaders() }),
  schedulePricing: (listingId, data) => client.post(`/pricing/${listingId}/schedule`, data, { headers: getHeaders() }),
  deleteSchedule: (listingId) => client.delete(`/pricing/${listingId}/schedule`, { headers: getHeaders() })
};
