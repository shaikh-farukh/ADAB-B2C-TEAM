
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


  async getB2BOrders(storeId = null) {
    return await sellerRepository.getB2BOrders(storeId);
  }

  async updateB2BOrderStatus(orderId, status, metadata = {}, storeId = null) {
    return await sellerRepository.updateB2BOrderStatus(orderId, status, metadata, storeId);
  }

  async getCoupons(storeId = null) {
    return await sellerRepository.getCoupons(storeId);
  }

  async getPoints(userId) {
    return await sellerRepository.getPoints(userId);
  }

  async getAnalytics(storeId) {
    return await sellerRepository.getAnalytics(storeId);
  }

  async getNearbyCatalog(storeId, options) {
    return await sellerRepository.getNearbyCatalog(storeId, options);
  }

  async getNearbyStores(storeId, options) {
    return await sellerRepository.getNearbyStores(storeId, options);
  }

  async getBuyerCreditInfo(userId, storeId) {
    return await sellerRepository.getBuyerCreditInfo(userId, storeId);
  }

  async getPurchaseOrders(storeId, options = {}) {
    return await sellerRepository.getPurchaseOrders(storeId, options);
  }

  async createPurchaseOrder(storeId, userId, orderData) {
    return await sellerRepository.createPurchaseOrder(storeId, userId, orderData);
  }

  async getOtherStoreBrands(storeId, options) {
    return await sellerRepository.getOtherStoreBrands(storeId, options);
  }

  async addOtherStoreBrandToMyStore(storeId, data) {
    return await sellerRepository.addOtherStoreBrandToMyStore(storeId, data);
  }

  async getMyAddedOtherStoreBrands(storeId) {
    return await sellerRepository.getMyAddedOtherStoreBrands(storeId);
  }

  async getPurchasedBrandsReadyToPublish(storeId) {
    return await sellerRepository.getPurchasedBrandsReadyToPublish(storeId);
  }

  async getBrandDistributionAnalytics(storeId) {
    return await sellerRepository.getBrandDistributionAnalytics(storeId);
  }

  async toggleListingB2B(storeId, listingId) {
    return await sellerRepository.toggleListingB2B(storeId, listingId);
  }

  async requestResaleStock(storeId, data) {
    return await sellerRepository.requestResaleStock(storeId, data);
  }

  async getIncomingResaleRequests(storeId) {
    return await sellerRepository.getIncomingResaleRequests(storeId);
  }

  async approveResaleRequest(storeId, orderId) {
    return await sellerRepository.approveResaleRequest(storeId, orderId);
  }

  async declineResaleRequest(storeId, orderId, reason) {
    return await sellerRepository.declineResaleRequest(storeId, orderId, reason);
  }

  async confirmAndPayResaleOrder(storeId, orderId, paymentData) {
    return await sellerRepository.confirmAndPayResaleOrder(storeId, orderId, paymentData);
  }

  async toggleBlockResellerStore(storeId, buyerStoreId, block) {
    return await sellerRepository.toggleBlockResellerStore(storeId, buyerStoreId, block);
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

  async getStoreCreditRules(userId, storeId) {
    return await sellerRepository.getStoreCreditRules(userId, storeId);
  }

  async updateCreditGiveTerms(userId, storeId, terms) {
    return await sellerRepository.updateCreditGiveTerms(userId, storeId, terms);
  }

  async updateCreditBuyLimits(userId, storeId, limits) {
    return await sellerRepository.updateCreditBuyLimits(userId, storeId, limits);
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

  async loginWithOtp(phone, otp, extra = {}) {
    return await sellerRepository.loginWithOtp(phone, otp, extra);
  }

  async resetPassword(phone, otp, newPassword, extra = {}) {
    return await sellerRepository.resetPassword(phone, otp, newPassword, extra);
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

  async sendOtp(identifier, meta = {}) {
    const emailOtpService = require('./emailOtpService');
    const otp = emailOtpService.generateOTP();
    const isEmail = identifier && identifier.includes('@');
    if (isEmail) {
      return await emailOtpService.sendOTPEmail(identifier, otp, meta);
    }
    // For phone identifier, save OTP and return simulated / dev confirmation
    emailOtpService.saveOTP(identifier, otp);
    console.log(`[Seller Service] 📱 Phone OTP simulated for ${identifier}: ${otp}`);
    return {
      success: true,
      messageId: `phone-simulated-${Date.now()}`,
      isSimulated: true,
      otp
    };
  }

  async verifyOtp(identifier, otp) {
    const emailOtpService = require('./emailOtpService');
    return emailOtpService.verifyOTP(identifier, otp);
  }
}

module.exports = new SellerService();

