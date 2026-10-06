const sellerService = require('../services/seller');

class SellerController {
  async getProfile(req, res) {
    try {
      const sellerId = req.headers['x-user-id'];
      if (!sellerId) return res.status(401).json({ success: false, error: 'Missing x-user-id header' });
      
      const profile = await sellerService.getSellerProfile(sellerId);
      if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
      
      res.json({ success: true, data: profile });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getStore(req, res) {
    try {
      const sellerId = req.headers['x-user-id'];
      if (!sellerId) return res.status(401).json({ success: false, error: 'Missing x-user-id header' });
      
      const store = await sellerService.getSellerStore(sellerId);
      if (!store) return res.status(404).json({ success: false, error: 'Store not found' });
      
      res.json({ success: true, data: store });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new SellerController();
