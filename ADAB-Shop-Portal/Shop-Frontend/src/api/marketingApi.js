import client from './client';

export const marketingApi = {
  fetchPromotions: () => client.get('/promotions'),
  createPromotion: (data) => client.post('/promotions', data),
  updatePromotion: (id, data) => client.patch(`/promotions/${id}`, data),
  deletePromotion: (id) => client.delete(`/promotions/${id}`),
  
  fetchCoupons: () => client.get('/coupons'),
  createCoupon: (data) => client.post('/coupons', data),
  updateCoupon: (id, data) => client.patch(`/coupons/${id}`, data)
};
