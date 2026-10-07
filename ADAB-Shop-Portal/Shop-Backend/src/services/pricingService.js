const pricingRepo = require('../repositories/pricingRepository');

module.exports = {
  fetchPricing: async (storeId) => {
    return await pricingRepo.getPricingSchedules(storeId);
  },
  
  applyBulkPricing: async (storeId, updates) => {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates must be an array');
    }
    return await pricingRepo.updateBulkPricing(storeId, updates);
  },

  updateBasePricing: async (storeId, listingId, data) => {
    if (data.sell_price == null || data.mrp == null) {
      throw new Error('Prices cannot be null');
    }
    return await pricingRepo.updateListingPricing(storeId, listingId, data);
  },
  
  getPricingHistory: async (storeId) => {
    return await pricingRepo.getPricingHistory(storeId);
  },
  
  previewPricing: async (storeId, listingId) => {
    return await pricingRepo.previewPricing(storeId, listingId);
  },
  
  schedulePricing: async (storeId, listingId, data) => {
    return await pricingRepo.schedulePricing(storeId, listingId, data);
  },
  
  deleteSchedule: async (storeId, listingId) => {
    return await pricingRepo.deleteSchedule(storeId, listingId);
  }
};
