const sellerService = require('../services/seller');
const { getAuthenticatedSellerContext } = require('../middlewares/auth');

function handleError(res, error) {
  const status = Number(error?.statusCode) || 400;
  return res.status(status).json({ success: false, error: error.message });
}

function extractPaginationFilters(req) {
  return {
    status: req.query?.status,
    search: req.query?.search,
    limit: req.query?.limit,
    offset: req.query?.offset,
    page: req.query?.page
  };
}

async function resolveSellerStoreId(req) {
  const { userId, storeId: ctxStoreId } = getAuthenticatedSellerContext(req);
  let storeId = ctxStoreId || null;

  if (userId && typeof sellerService.getSellerStore === 'function') {
    const ownedStore = await sellerService.getSellerStore(userId);
    if (ownedStore && ownedStore.id) {
      storeId = ownedStore.id;
    }
  }

  const headerStoreId = req.headers['x-store-id'];
  if (headerStoreId && storeId && String(headerStoreId) !== String(storeId)) {
    const err = new Error('Forbidden: Cross-seller store access denied');
    err.statusCode = 403;
    throw err;
  }

  if (!storeId) {
    const err = new Error('Forbidden: Seller store not configured or unauthorized');
    err.statusCode = 403;
    throw err;
  }

  return { userId, storeId };
}

class SellerController {
  // === Shabbir's Day 1-4 APIs ===

  async getProfile(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const profile = await sellerService.getSellerProfile(sellerId);
      if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
      
      res.json({ success: true, data: profile });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getStore(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const store = await sellerService.getSellerStore(sellerId);
      if (!store) return res.status(404).json({ success: false, error: 'Store not found' });
      
      res.json({ success: true, data: store });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateProfile(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const profile = await sellerService.updateSellerProfile(sellerId, req.body);
      res.json({ success: true, data: profile });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateStore(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const store = await sellerService.updateSellerStore(sellerId, req.body);
      res.json({ success: true, data: store });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getSettings(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const settings = await sellerService.getSellerSettings(sellerId);
      res.json({ success: true, data: settings });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateSettings(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const settings = await sellerService.updateSellerSettings(sellerId, req.body);
      res.json({ success: true, data: settings });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getDashboardMetrics(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const metrics = await sellerService.getDashboardMetrics(sellerId);
      res.json({ success: true, data: metrics || {} });
    } catch (error) {
      handleError(res, error);
    }
  }

  // === Mayank's Fulfillment / Operations APIs ===

  async getOrders(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const orders = await sellerService.getSellerOrders(storeId, extractPaginationFilters(req));
      res.json({ success: true, data: orders });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const { id } = req.params;
      const { status } = req.body || {};
      const updated = await sellerService.updateOrderStatus(id, status, storeId);
      res.json({ success: true, data: updated });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getReturns(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const returns = await sellerService.getSellerReturns(storeId, extractPaginationFilters(req));
      res.json({ success: true, data: returns });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateReturnStatus(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const { id } = req.params;
      const { status, rejectionReason, refundAmount, refund_amount } = req.body || {};
      const regulatedRefund = refundAmount !== undefined ? refundAmount : refund_amount;
      const updated = await sellerService.updateReturnStatus(id, status, rejectionReason, storeId, regulatedRefund);
      res.json({ success: true, data: updated });
    } catch (error) {
      handleError(res, error);
    }
  }


  async getB2BOrders(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const b2bOrders = await sellerService.getB2BOrders(storeId);
      res.json({ success: true, data: b2bOrders });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateB2BOrderStatus(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const { id } = req.params;
      const { status, metadata, delivery_method, rejection_reason, auto_add_stock } = req.body || {};
      const payloadMetadata = metadata || {
        delivery_method,
        rejection_reason,
        auto_add_stock: auto_add_stock !== undefined ? auto_add_stock : (status === 'DELIVERED' || status === 'RECEIVED')
      };
      const updated = await sellerService.updateB2BOrderStatus(id, status, payloadMetadata, storeId);
      res.json({ success: true, data: updated, message: 'B2B order status updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getCoupons(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const coupons = await sellerService.getCoupons(storeId);
      res.json({ success: true, data: coupons });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getPoints(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      if (!userId) return res.status(401).json({ success: false, error: 'Missing user context' });
      const points = await sellerService.getPoints(userId);
      res.json({ success: true, data: points });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getAnalytics(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });
      const analytics = await sellerService.getAnalytics(storeId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getNearbyCatalog(req, res) {
    try {
      const { storeId, userId } = getAuthenticatedSellerContext(req);
      const { distance, category, q } = req.query;
      const catalog = await sellerService.getNearbyCatalog(storeId, { distance, category, q, userId });
      res.json({ success: true, data: catalog });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getNearbyStores(req, res) {
    try {
      const { storeId, userId } = getAuthenticatedSellerContext(req);
      const { distance, category, q } = req.query;
      const stores = await sellerService.getNearbyStores(storeId, { distance, category, q, userId });
      res.json({ success: true, data: stores });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getBuyerCreditInfo(req, res) {
    try {
      const { storeId, userId } = await resolveSellerStoreId(req);
      const credit = await sellerService.getBuyerCreditInfo(userId, storeId);
      res.json({ success: true, data: credit });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getPurchaseOrders(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const { type } = req.query;
      const orders = await sellerService.getPurchaseOrders(storeId, { type });
      res.json({ success: true, data: orders });
    } catch (error) {
      handleError(res, error);
    }
  }

  async createPurchaseOrder(req, res) {
    try {
      const { storeId, userId } = await resolveSellerStoreId(req);
      const orders = await sellerService.createPurchaseOrder(storeId, userId, req.body);
      res.status(201).json({ success: true, data: orders });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getOtherStoreBrands(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const { category, q, storeFilter } = req.query;
      const brands = await sellerService.getOtherStoreBrands(storeId, { category, q, storeFilter });
      res.json({ success: true, data: brands });
    } catch (error) {
      handleError(res, error);
    }
  }

  async addOtherStoreBrandToMyStore(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const { originalListingId, sellPrice, wholesalePrice, stockQty } = req.body;
      if (!originalListingId) {
        return res.status(400).json({ success: false, error: 'originalListingId is required' });
      }
      const added = await sellerService.addOtherStoreBrandToMyStore(storeId, { originalListingId, sellPrice, wholesalePrice, stockQty });
      res.status(201).json({ success: true, data: added, message: 'Added to your store catalog successfully' });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getMyAddedOtherStoreBrands(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const added = await sellerService.getMyAddedOtherStoreBrands(storeId);
      res.json({ success: true, data: added });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getPurchasedBrandsReadyToPublish(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const items = await sellerService.getPurchasedBrandsReadyToPublish(storeId);
      res.json({ success: true, data: items });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getBrandDistributionAnalytics(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const analytics = await sellerService.getBrandDistributionAnalytics(storeId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      handleError(res, error);
    }
  }

  async toggleListingB2B(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const listingId = req.params.id;
      const updated = await sellerService.toggleListingB2B(storeId, listingId);
      res.json({ success: true, data: updated, message: 'B2B distribution status updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  }

  async requestResaleStock(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const { originalListingId, quantity, resaleSellPrice, paymentTerms, notes } = req.body;
      if (!originalListingId) {
        return res.status(400).json({ success: false, error: 'originalListingId is required' });
      }
      const requestResult = await sellerService.requestResaleStock(storeId, {
        originalListingId,
        quantity,
        resaleSellPrice,
        paymentTerms,
        notes
      });
      res.status(201).json({
        success: true,
        data: requestResult,
        message: 'Resale authorization and stock request submitted to brand manufacturer'
      });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getIncomingResaleRequests(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const requests = await sellerService.getIncomingResaleRequests(storeId);
      res.json({ success: true, data: requests });
    } catch (error) {
      handleError(res, error);
    }
  }

  async approveResaleRequest(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const orderId = req.params.id;
      const approved = await sellerService.approveResaleRequest(storeId, orderId);
      res.json({ success: true, data: approved, message: 'Resale request approved successfully' });
    } catch (error) {
      handleError(res, error);
    }
  }

  async declineResaleRequest(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const orderId = req.params.id;
      const { reason } = req.body;
      const declined = await sellerService.declineResaleRequest(storeId, orderId, reason);
      res.json({ success: true, data: declined, message: 'Resale request declined' });
    } catch (error) {
      handleError(res, error);
    }
  }

  async confirmAndPayResaleOrder(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const orderId = req.params.id;
      const { payment_method, payment_reference, metadata } = req.body;
      const result = await sellerService.confirmAndPayResaleOrder(storeId, orderId, {
        payment_method,
        payment_reference,
        metadata
      });
      res.json({
        success: true,
        data: result,
        message: 'Resale order paid & activated in your catalog with real inventory!'
      });
    } catch (error) {
      handleError(res, error);
    }
  }

  async toggleBlockResellerStore(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const { buyerStoreId } = req.params;
      const { block } = req.body;
      const result = await sellerService.toggleBlockResellerStore(storeId, buyerStoreId, block !== false);
      res.json({
        success: true,
        data: result,
        message: block !== false ? 'Store blocked from future resale requests' : 'Store unblocked'
      });
    } catch (error) {
      handleError(res, error);
    }
  }



  async getRecommendations(req, res) {
    try {
      const recommendations = await sellerService.getRecommendations();
      res.json({ success: true, data: recommendations });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getThreads(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      if (!userId) return res.status(401).json({ error: 'Missing user context' });
      const threads = await sellerService.getThreads(userId);
      res.json({ success: true, data: threads });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getThreadMessages(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      if (!userId) return res.status(401).json({ error: 'Missing user context' });
      const messages = await sellerService.getThreadMessages(userId, req.params.threadId);
      res.json({ success: true, data: messages });
    } catch (error) {
      handleError(res, error);
    }
  }

  async sendThreadMessage(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      if (!userId) return res.status(401).json({ error: 'Missing user context' });
      const message = await sellerService.sendThreadMessage(userId, req.params.threadId, req.body);
      res.json({ success: true, data: message });
    } catch (error) {
      handleError(res, error);
    }
  }

  async markThreadRead(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      if (!userId) return res.status(401).json({ error: 'Missing user context' });
      const result = await sellerService.markThreadRead(userId, req.params.threadId);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  }

  async resolveSellerStoreId(req) {
    return resolveSellerStoreId(req);
  }

  async getFinanceSummary(req, res) {
    try {
      const { userId, storeId } = await resolveSellerStoreId(req);
      const finance = await sellerService.getFinanceSummary(storeId, userId);
      res.json({ success: true, data: finance });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getFinanceTransactions(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const transactions = await sellerService.getFinanceTransactions(storeId);
      res.json({ success: true, data: transactions });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getFinanceSettlements(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const settlements = await sellerService.getFinanceSettlements(storeId);
      res.json({ success: true, data: settlements });
    } catch (error) {
      handleError(res, error);
    }
  }

  async createWithdrawalSettlement(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const settlement = await sellerService.createWithdrawalSettlement(storeId);
      res.json({ success: true, data: settlement });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getKhataLedger(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const khata = await sellerService.getKhataLedger(storeId);
      res.json({ success: true, data: khata });
    } catch (error) {
      handleError(res, error);
    }
  }

  async payKhataOrder(req, res) {
    try {
      const { storeId } = await resolveSellerStoreId(req);
      const { id } = req.params;
      const updated = await sellerService.payKhataOrder(storeId, id);
      res.json({ success: true, data: updated });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getStoreCreditRules(req, res) {
    try {
      const { storeId, userId } = await resolveSellerStoreId(req);
      const data = await sellerService.getStoreCreditRules(userId, storeId);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateCreditGiveTerms(req, res) {
    try {
      const { storeId, userId } = await resolveSellerStoreId(req);
      const data = await sellerService.updateCreditGiveTerms(userId, storeId, req.body);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error);
    }
  }

  async updateCreditBuyLimits(req, res) {
    try {
      const { storeId, userId } = await resolveSellerStoreId(req);
      const data = await sellerService.updateCreditBuyLimits(userId, storeId, req.body);
      res.json({ success: true, data });
    } catch (error) {
      handleError(res, error);
    }
  }

  async handleWebhookCallback(req, res) {
    try {
      const configuredSecret = process.env.WEBHOOK_SECRET || 'adab_secret_webhook_key_2026';
      const providedSecret = req.headers['x-webhook-secret'] || req.headers['x-webhook-signature'];
      if (!providedSecret || providedSecret !== configuredSecret) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or missing webhook signature' });
      }

      const { event_type, order_id, return_id, status, rejection_reason } = req.body || {};
      const normalizedType = String(event_type || '').toUpperCase();

      if (normalizedType === 'ORDER_STATUS_UPDATED' && order_id && status) {
        const pool = require('../../db');
        const cleanId = order_id.toString().replace(/^#/, '');
        const orderLookup = await pool.query(
          `SELECT store_id FROM seller_orders WHERE id::text = $1 OR parent_order_id IN (SELECT id FROM orders WHERE id::text = $1 OR order_number = $1 OR order_number = ('ORD-' || $1)) LIMIT 1`,
          [cleanId]
        );
        const storeId = orderLookup.rows[0]?.store_id;
        if (!storeId) {
          return res.status(404).json({ success: false, error: `Order '${order_id}' not found` });
        }
        const updated = await sellerService.updateOrderStatus(order_id, status, storeId);
        return res.json({ success: true, event_type: normalizedType, data: updated });
      }

      if (normalizedType === 'RETURN_STATUS_UPDATED' && return_id && status) {
        const pool = require('../../db');
        const cleanId = String(return_id).trim();
        const shortPrefix = cleanId.replace(/^#?RET-/i, '').toUpperCase();
        const retLookup = await pool.query(
          `SELECT so.store_id FROM returns r JOIN seller_orders so ON r.seller_order_id = so.id WHERE r.id::text = $1 OR UPPER(SUBSTRING(r.id::text, 1, 4)) = $2 LIMIT 1`,
          [cleanId, shortPrefix]
        );
        const storeId = retLookup.rows[0]?.store_id;
        if (!storeId) {
          return res.status(404).json({ success: false, error: `Return '${return_id}' not found` });
        }
        const updated = await sellerService.updateReturnStatus(return_id, status, rejection_reason || null, storeId);
        return res.json({ success: true, event_type: normalizedType, data: updated });
      }

      return res.json({
        success: true,
        event_type: normalizedType || 'WEBHOOK_ACK',
        received_at: new Date().toISOString()
      });
    } catch (error) {
      handleError(res, error);
    }
  }

  // === Auth & 7-Step Incremental KYC Onboarding ===

  async login(req, res) {
    try {
      const { phone, email, password, pin, idMode } = req.body;
      const resolvedPassword = password || pin;
      const result = await sellerService.loginWithPassword(phone, resolvedPassword, {
        email,
        password: resolvedPassword,
        idMode
      });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async loginWithOtp(req, res) {
    try {
      const { phone, email, otp, idMode } = req.body;
      const result = await sellerService.loginWithOtp(phone, otp, {
        email,
        idMode
      });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async googleLogin(req, res) {
    try {
      const { credential, idToken, accessToken } = req.body;
      const result = await sellerService.loginWithGoogle({ credential, idToken, accessToken });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async resetPassword(req, res) {
    try {
      const { phone, email, otp, newPassword, password, idMode } = req.body;
      const targetPassword = newPassword || password;
      const result = await sellerService.resetPassword(phone, otp, targetPassword, {
        email,
        idMode
      });
      res.json({ success: true, message: result.message, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async signup(req, res) {
    try {
      const { phone, email, password, pin, full_name, store_name } = req.body;
      const resolvedPassword = password || pin;
      const result = await sellerService.signupWithPassword(phone, resolvedPassword, {
        email,
        full_name,
        store_name
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getOnboarding(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      const data = await sellerService.getOnboardingData(userId);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async saveOnboardingStep(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      const { stepNum } = req.params;
      const data = await sellerService.saveOnboardingStep(userId, stepNum, req.body);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async sendOtp(req, res) {
    try {
      const { email, phone, idMode, name, store_name } = req.body;
      const identifier = (idMode === 'email' ? email : (email || phone)) || '';
      if (!identifier) {
        return res.status(400).json({ success: false, error: 'Email or phone number is required' });
      }
      const result = await sellerService.sendOtp(identifier, {
        name,
        storeName: store_name,
        idMode
      });
      res.json({
        success: true,
        message: 'Verification code sent successfully',
        data: {
          recipient: identifier,
          isSimulated: Boolean(result?.isSimulated),
          expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 5} minutes`,
          ...(result?.otp ? { otp: result.otp } : {})
        }
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async verifyOtp(req, res) {
    try {
      const { email, phone, otp, idMode } = req.body;
      const identifier = (idMode === 'email' ? email : (email || phone)) || '';
      if (!identifier || !otp) {
        return res.status(400).json({ success: false, error: 'Identifier and OTP code are required' });
      }
      const verifyResult = await sellerService.verifyOtp(identifier, otp);
      if (!verifyResult.success) {
        return res.status(400).json({ success: false, error: verifyResult.message || 'Invalid OTP' });
      }
      res.json({ success: true, message: 'OTP verified successfully', data: verifyResult });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }



  async createPOSSale(req, res) {
    try {
      const { storeId, userId } = getAuthenticatedSellerContext(req);
      const { cart, paymentMethod, customerPhone } = req.body;
      const result = await sellerService.createPOSSale(storeId, userId, { cart, paymentMethod, customerPhone });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getMasterCatalog(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const { q, category_id, limit, offset } = req.query;
      const result = await sellerService.getMasterCatalog(storeId, { q, category_id, limit, offset });
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  }

  async adoptMasterCatalogItem(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      const { masterCatalogId, sellPrice, stockQty } = req.body;
      const result = await sellerService.adoptMasterCatalogItem(storeId, { masterCatalogId, sellPrice, stockQty });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getBankPartners(req, res) {
    try {
      const banks = await sellerService.getBankPartners();
      res.json({ success: true, data: banks });
    } catch (error) {
      handleError(res, error);
    }
  }

  async submitCreditApply(req, res) {
    try {
      const { storeId, userId } = getAuthenticatedSellerContext(req);
      const result = await sellerService.submitCreditApplication(storeId, userId, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getCreditApplications(req, res) {
    try {
      const { storeId, userId } = getAuthenticatedSellerContext(req);
      const result = await sellerService.getCreditApplications(storeId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      handleError(res, error);
    }
  }
}

module.exports = new SellerController();
