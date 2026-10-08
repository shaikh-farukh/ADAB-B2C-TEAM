const sellerService = require('../services/seller');
const { getAuthenticatedSellerContext } = require('../middlewares/auth');

class SellerController {
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
}

module.exports = new SellerController();
