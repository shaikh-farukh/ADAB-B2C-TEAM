const marketingService = require('../services/marketingService');
const { createPromotionSchema, updatePromotionSchema, createCouponSchema, updateCouponSchema } = require('../dtos/marketingDto');
const { getAuthenticatedSellerContext } = require('../middlewares/auth');

function getAuthorizedStoreId(req) {
  const { storeId } = getAuthenticatedSellerContext(req);
  const headerStoreId = req.headers['x-store-id'];
  if (headerStoreId && storeId && String(headerStoreId) !== String(storeId)) {
    const err = new Error('Forbidden: Cross-seller store access denied');
    err.statusCode = 403;
    throw err;
  }
  if (!storeId) {
    const err = new Error('Forbidden: Store context required');
    err.statusCode = 403;
    throw err;
  }
  return storeId;
}

module.exports = {
  getPromotions: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const promos = await marketingService.fetchPromotions(storeId);
      res.json(promos);
    } catch (err) {
      const status = err.statusCode || (err.message.startsWith('Forbidden') ? 403 : 500);
      res.status(status).json({ error: err.message });
    }
  },

  checkOverlap: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const { listing_ids, start_date, end_date, exclude_promo_id } = req.body;
      const overlaps = await marketingService.checkOverlap(storeId, {
        listing_ids,
        start_date,
        end_date,
        exclude_promo_id
      });
      res.json({ overlaps, hasOverlap: overlaps.length > 0 });
    } catch (err) {
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  },

  createPromotion: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const validatedData = createPromotionSchema.parse(req.body);
      const promo = await marketingService.addPromotion(storeId, validatedData);
      res.status(201).json(promo);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  },

  updatePromotion: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const validatedData = updatePromotionSchema.parse(req.body);
      const promo = await marketingService.editPromotion(storeId, req.params.id, validatedData);
      res.json(promo);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  },

  deletePromotion: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      await marketingService.removePromotion(storeId, req.params.id);
      res.status(204).send();
    } catch (err) {
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  },

  getCoupons: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const coupons = await marketingService.fetchCoupons(storeId);
      res.json(coupons);
    } catch (err) {
      const status = err.statusCode || (err.message.startsWith('Forbidden') ? 403 : 500);
      res.status(status).json({ error: err.message });
    }
  },

  createCoupon: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const validatedData = createCouponSchema.parse(req.body);
      const coupon = await marketingService.addCoupon(storeId, validatedData);
      res.status(201).json(coupon);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  },

  updateCoupon: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const validatedData = updateCouponSchema.parse(req.body);
      const coupon = await marketingService.editCoupon(storeId, req.params.id, validatedData);
      res.json(coupon);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  }
};
