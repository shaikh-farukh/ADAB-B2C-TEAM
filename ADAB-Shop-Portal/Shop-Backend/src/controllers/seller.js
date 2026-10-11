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
  const headerStoreId = req.headers['x-store-id'] || ctxStoreId || null;
  let storeId = headerStoreId;

  if (userId && typeof sellerService.getSellerStore === 'function') {
    const ownedStore = await sellerService.getSellerStore(userId);
    if (ownedStore && ownedStore.id) {
      if (headerStoreId && String(headerStoreId) !== String(ownedStore.id)) {
        const err = new Error('Forbidden: Cross-seller store access denied');
        err.statusCode = 403;
        throw err;
      }
      storeId = ownedStore.id;
    }
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
      const { status, rejectionReason } = req.body || {};
      const updated = await sellerService.updateReturnStatus(id, status, rejectionReason, storeId);
      res.json({ success: true, data: updated });
    } catch (error) {
      handleError(res, error);
    }
  }


  async getB2BOrders(req, res) {
    try {
      const b2bOrders = await sellerService.getB2BOrders();
      res.json({ success: true, data: b2bOrders });
    } catch (error) {
      handleError(res, error);
    }
  }

  async getCoupons(req, res) {
    try {
      const coupons = await sellerService.getCoupons();
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
      const catalog = await sellerService.getNearbyCatalog();
      res.json({ success: true, data: catalog });
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

  async handleWebhookCallback(req, res) {
    try {
      const { event_type, order_id, return_id, status, rejection_reason } = req.body || {};
      const normalizedType = String(event_type || '').toUpperCase();

      if (normalizedType === 'ORDER_STATUS_UPDATED' && order_id && status) {
        const updated = await sellerService.updateOrderStatus(order_id, status);
        return res.json({ success: true, event_type: normalizedType, data: updated });
      }

      if (normalizedType === 'RETURN_STATUS_UPDATED' && return_id && status) {
        const updated = await sellerService.updateReturnStatus(return_id, status, rejection_reason || null);
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

}

module.exports = new SellerController();
