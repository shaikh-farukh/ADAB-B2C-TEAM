const sellerService = require('../services/seller');
const { getAuthenticatedSellerContext } = require('../middlewares/auth');

class SellerController {
  // === Shabbir's Day 1-4 APIs ===

  async getProfile(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const profile = await sellerService.getSellerProfile(sellerId);
      if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
      
      res.json({ success: true, data: profile });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getStore(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const store = await sellerService.getSellerStore(sellerId);
      if (!store) return res.status(404).json({ success: false, error: 'Store not found' });
      
      res.json({ success: true, data: store });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateProfile(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const profile = await sellerService.updateSellerProfile(sellerId, req.body);
      res.json({ success: true, data: profile });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateStore(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const store = await sellerService.updateSellerStore(sellerId, req.body);
      res.json({ success: true, data: store });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getSettings(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const settings = await sellerService.getSellerSettings(sellerId);
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateSettings(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const settings = await sellerService.updateSellerSettings(sellerId, req.body);
      res.json({ success: true, data: settings });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getDashboardMetrics(req, res) {
    try {
      const { userId: sellerId } = getAuthenticatedSellerContext(req);
      const metrics = await sellerService.getDashboardMetrics(sellerId);
      res.json({ success: true, data: metrics || {} });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // === Mayank's Fulfillment / Operations APIs ===

  async getOrders(req, res) {
    try {
      const { userId, storeId: ctxStoreId } = getAuthenticatedSellerContext(req);
      let storeId = req.headers['x-store-id'] || ctxStoreId;
      if (!storeId || storeId === '00000000-0000-0000-0000-000000000001') {
        const store = await sellerService.getSellerStore(userId);
        if (store) storeId = store.id;
      }
      const orders = await sellerService.getSellerOrders(storeId);
      res.json({ success: true, data: orders });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await sellerService.updateOrderStatus(id, status);
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getReturns(req, res) {
    try {
      const returns = await sellerService.getSellerReturns();
      res.json({ success: true, data: returns });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getB2BOrders(req, res) {
    try {
      const b2bOrders = await sellerService.getB2BOrders();
      res.json({ success: true, data: b2bOrders });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getCoupons(req, res) {
    try {
      const coupons = await sellerService.getCoupons();
      res.json({ success: true, data: coupons });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getPoints(req, res) {
    try {
      const userId = req.headers['x-user-id'] || '00000000-0000-0000-0000-000000000001';
      const points = await sellerService.getPoints(userId);
      res.json({ success: true, data: points });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getAnalytics(req, res) {
    try {
      const { storeId } = getAuthenticatedSellerContext(req);
      if (!storeId) return res.status(401).json({ error: 'Missing store context' });
      const analytics = await sellerService.getAnalytics(storeId);
      res.json({ success: true, data: analytics });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getNearbyCatalog(req, res) {
    try {
      const catalog = await sellerService.getNearbyCatalog();
      res.json({ success: true, data: catalog });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getRecommendations(req, res) {
    try {
      const recommendations = await sellerService.getRecommendations();
      res.json({ success: true, data: recommendations });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getMessages(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      if (!userId) return res.status(401).json({ error: 'Missing user context' });
      const messages = await sellerService.getMessages(userId);
      res.json({ success: true, data: messages });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async sendMessage(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      if (!userId) return res.status(401).json({ error: 'Missing user context' });
      const message = await sellerService.sendMessage(userId, req.body);
      res.json({ success: true, data: message });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async markMessageRead(req, res) {
    try {
      const { userId } = getAuthenticatedSellerContext(req);
      if (!userId) return res.status(401).json({ error: 'Missing user context' });
      const result = await sellerService.markMessageRead(userId, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getFinanceSummary(req, res) {
    try {
      const finance = await sellerService.getFinanceSummary();
      res.json({ success: true, data: finance });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getKhataLedger(req, res) {
    try {
      const khata = await sellerService.getKhataLedger();
      res.json({ success: true, data: khata });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new SellerController();
