const marketingRepo = require('../repositories/marketingRepository');

module.exports = {
  fetchPromotions: async (storeId) => {
    return await marketingRepo.getPromotionsByStore(storeId);
  },
  
  addPromotion: async (storeId, data) => {
    if (!data.title || !data.start_date || !data.end_date) {
      throw new Error('Missing required promotion fields');
    }
    return await marketingRepo.createPromotion(storeId, data);
  },

  editPromotion: async (storeId, id, data) => {
    return await marketingRepo.updatePromotion(storeId, id, data);
  },

  removePromotion: async (storeId, id) => {
    return await marketingRepo.deletePromotion(storeId, id);
  },

  fetchCoupons: async (storeId) => {
    return await marketingRepo.getCouponsByStore(storeId);
  },

  addCoupon: async (storeId, data) => {
    if (!data.code || !data.discount_value) {
      throw new Error('Missing required coupon fields');
    }
    data.code = data.code.toUpperCase();
    if (data.discount_type) data.discount_type = data.discount_type.toUpperCase();
    return await marketingRepo.createCoupon(storeId, data);
  },

  editCoupon: async (storeId, id, data) => {
    return await marketingRepo.updateCoupon(storeId, id, data);
  }
};
