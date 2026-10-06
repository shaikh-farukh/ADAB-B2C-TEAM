const sellerRepository = require('../repositories/seller');

class SellerService {
  async getSellerProfile(sellerId) {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await sellerRepository.getProfile(sellerId);
  }

  async getSellerStore(sellerId) {
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    return await sellerRepository.getStore(sellerId);
  }
}

module.exports = new SellerService();
