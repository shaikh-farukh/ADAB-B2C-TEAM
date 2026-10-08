const marketingService = require('../services/marketingService');
const { createPromotionSchema, updatePromotionSchema, createCouponSchema, updateCouponSchema } = require('../dtos/marketingDto');

module.exports = {
  getPromotions: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const promos = await marketingService.fetchPromotions(storeId);
      res.json(promos);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createPromotion: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const validatedData = createPromotionSchema.parse(req.body);
      const promo = await marketingService.addPromotion(storeId, validatedData);
      res.status(201).json(promo);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  updatePromotion: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const validatedData = updatePromotionSchema.parse(req.body);
      const promo = await marketingService.editPromotion(storeId, req.params.id, validatedData);
      res.json(promo);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  deletePromotion: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      await marketingService.removePromotion(storeId, req.params.id);
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  getCoupons: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const coupons = await marketingService.fetchCoupons(storeId);
      res.json(coupons);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  createCoupon: async (req, res) => {
    console.log("Create coupon payload:", req.body);
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const validatedData = createCouponSchema.parse(req.body);
      const coupon = await marketingService.addCoupon(storeId, validatedData);
      res.status(201).json(coupon);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  updateCoupon: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const validatedData = updateCouponSchema.parse(req.body);
      const coupon = await marketingService.editCoupon(storeId, req.params.id, validatedData);
      res.json(coupon);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      res.status(400).json({ error: err.message });
    }
  }
};
