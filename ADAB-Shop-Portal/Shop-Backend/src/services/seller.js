const sellerRepository = require('../repositories/seller');

class SellerService {
  // === Shabbir's Day 1-4 APIs ===

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

  // === Mayank's Fulfillment / Operations APIs ===

  async getSellerOrders(storeId) {
    return await sellerRepository.getOrders(storeId);
  }

  async updateOrderStatus(orderId, status) {
    if (!orderId || !status) {
      throw new Error('Order ID and status are required');
    }
    return await sellerRepository.updateOrderStatus(orderId, status);
  }

  async getSellerReturns() {
    return await sellerRepository.getReturns();
  }

  async getB2BOrders() {
    return await sellerRepository.getB2BOrders();
  }

  async getCoupons() {
    return await sellerRepository.getCoupons();
  }

  async getPoints(userId) {
    return await sellerRepository.getPoints(userId);
  }

  async getAnalytics() {
    return await sellerRepository.getAnalytics();
  }

  async getNearbyCatalog() {
    return await sellerRepository.getNearbyCatalog();
  }

  async getRecommendations() {
    return await sellerRepository.getRecommendations();
  }

  async getMessages() {
    return await sellerRepository.getMessages();
  }

  async getFinanceSummary() {
    return await sellerRepository.getFinanceSummary();
  }

  async getKhataLedger() {
    return await sellerRepository.getKhataLedger();
  }
}

module.exports = new SellerService();
