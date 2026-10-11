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

  async getSellerOrders(storeId, filters = {}) {
    return await sellerRepository.getOrders(storeId, filters);
  }

  async updateOrderStatus(orderId, status, storeId = null) {
    if (!orderId || !status) {
      const err = new Error('Order ID and status are required');
      err.statusCode = 400;
      throw err;
    }
    return await sellerRepository.updateOrderStatus(orderId, status, storeId);
  }

  async getSellerReturns(storeId, filters = {}) {
    return await sellerRepository.getReturns(storeId, filters);
  }

  async updateReturnStatus(returnId, status, rejectionReason = null, storeId = null) {
    if (!returnId || !status) {
      const err = new Error('Return ID and status are required');
      err.statusCode = 400;
      throw err;
    }
    return await sellerRepository.updateReturnStatus(returnId, status, rejectionReason, storeId);
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

  async getAnalytics(storeId) {
    return await sellerRepository.getAnalytics(storeId);
  }

  async getNearbyCatalog() {
    return await sellerRepository.getNearbyCatalog();
  }

  async getRecommendations() {
    return await sellerRepository.getRecommendations();
  }

  async getThreads(userId) {
    return await sellerRepository.getThreads(userId);
  }

  async getThreadMessages(userId, threadId) {
    return await sellerRepository.getThreadMessages(userId, threadId);
  }

  async sendThreadMessage(userId, threadId, data) {
    if (!data.content) throw new Error("content is required");
    data.direction = 'OUTBOUND';
    return await sellerRepository.sendThreadMessage(userId, threadId, data);
  }

  async markThreadRead(userId, threadId) {
    return await sellerRepository.markThreadRead(userId, threadId);
  }

  async getFinanceSummary(storeId, userId) {
    return await sellerRepository.getFinanceSummary(storeId, userId);
  }

  async getFinanceTransactions(storeId) {
    return await sellerRepository.getFinanceTransactions(storeId);
  }

  async getFinanceSettlements(storeId) {
    return await sellerRepository.getFinanceSettlements(storeId);
  }

  async createWithdrawalSettlement(storeId) {
    return await sellerRepository.createWithdrawalSettlement(storeId);
  }

  async getKhataLedger(storeId) {
    return await sellerRepository.getKhataLedger(storeId);
  }

  async payKhataOrder(storeId, poId) {
    if (!poId) throw new Error('Purchase order ID is required');
    return await sellerRepository.payKhataOrder(storeId, poId);
  }

  async loginWithPassword(phone, password, extra = {}) {
    return await sellerRepository.loginWithPassword(phone, password, extra);
  }

  async signupWithPassword(phone, password, extra = {}) {
    return await sellerRepository.signupWithPassword(phone, password, extra);
  }

  async loginWithPin(phone, password, extra = {}) {
    return await sellerRepository.loginWithPassword(phone, password, extra);
  }

  async signupWithPin(phone, password, extra = {}) {
    return await sellerRepository.signupWithPassword(phone, password, extra);
  }

  async getOnboardingData(userId) {
    if (!userId) throw new Error('Seller ID is required');
    return await sellerRepository.getOnboardingData(userId);
  }

  async saveOnboardingStep(userId, stepNum, data) {
    if (!userId) throw new Error('Seller ID is required');
    return await sellerRepository.saveOnboardingStep(userId, stepNum, data);
  }
}

module.exports = new SellerService();
