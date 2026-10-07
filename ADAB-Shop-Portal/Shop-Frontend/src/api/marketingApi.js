import client from './client';

const storeId = '00000000-0000-0000-0000-000000000001'; // Mock store ID for testing

const getHeaders = () => ({ 'x-store-id': storeId });

export const marketingApi = {
  fetchPromotions: () => client.get('/promotions', { headers: getHeaders() }),
  createPromotion: (data) => client.post('/promotions', data, { headers: getHeaders() }),
  updatePromotion: (id, data) => client.patch(`/promotions/${id}`, data, { headers: getHeaders() }),
  deletePromotion: (id) => client.delete(`/promotions/${id}`, { headers: getHeaders() }),
  
  fetchCoupons: () => client.get('/coupons', { headers: getHeaders() }),
  createCoupon: (data) => client.post('/coupons', data, { headers: getHeaders() }),
  updateCoupon: (id, data) => client.patch(`/coupons/${id}`, data, { headers: getHeaders() })
};
