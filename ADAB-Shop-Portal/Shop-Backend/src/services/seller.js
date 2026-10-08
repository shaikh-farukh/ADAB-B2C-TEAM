const sellerRepository = require('../repositories/seller');

class SellerService {
  async getSellerProfile(sellerId) {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await sellerRepository.getProfile(sellerId);
  }

  async getSellerStore(sellerId) {
    if (!sellerId) throw new Error('Seller ID is required');
    return await sellerRepository.getStore(sellerId);
  }

  async updateSellerProfile(sellerId, data) {
    if (!sellerId) throw new Error('Seller ID is required');
    return await sellerRepository.updateProfile(sellerId, data);
  }

  async updateSellerStore(sellerId, data) {
    if (!sellerId) throw new Error('Seller ID is required');
    return await sellerRepository.updateStore(sellerId, data);
  }

  async getSellerSettings(sellerId) {
    if (!sellerId) throw new Error('Seller ID is required');
    return await sellerRepository.getSettings(sellerId);
  }

  async updateSellerSettings(sellerId, data) {
    if (!sellerId) throw new Error('Seller ID is required');
    return await sellerRepository.updateSettings(sellerId, data);
  }

  async getDashboardMetrics(sellerId) {
    if (!sellerId) throw new Error('Seller ID is required');
    return await sellerRepository.getDashboardMetrics(sellerId);
  }
}

module.exports = new SellerService();
