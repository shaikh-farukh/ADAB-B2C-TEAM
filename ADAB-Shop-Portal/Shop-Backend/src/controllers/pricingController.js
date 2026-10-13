const pricingService = require('../services/pricingService');
const { bulkPricingUpdateSchema, pricingUpdateSchema, schedulePricingSchema } = require('../dtos/pricingDto');
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
  getPricing: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const schedules = await pricingService.fetchPricing(storeId);
      res.json(schedules);
    } catch (err) {
      const status = err.statusCode || (err.message.startsWith('Forbidden') ? 403 : 500);
      res.status(status).json({ error: err.message });
    }
  },

  updateBulkPricing: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const validatedData = bulkPricingUpdateSchema.parse(req.body);
      const result = await pricingService.applyBulkPricing(storeId, validatedData.updates);
      res.status(200).json(result);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  },

  updateListingPricing: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const validatedData = pricingUpdateSchema.parse(req.body);
      const listing = await pricingService.updateBasePricing(storeId, req.params.listingId, validatedData);
      res.json(listing);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  },

  getPricingHistory: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const history = await pricingService.getPricingHistory(storeId);
      res.json(history);
    } catch (err) {
      const status = err.statusCode || (err.message.startsWith('Forbidden') ? 403 : 500);
      res.status(status).json({ error: err.message });
    }
  },

  getAllPreviews: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const data = await pricingService.getAllPreviews(storeId);
      res.json(data);
    } catch (err) {
      const status = err.statusCode || (err.message.startsWith('Forbidden') ? 403 : 500);
      res.status(status).json({ error: err.message });
    }
  },

  previewPricing: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const preview = await pricingService.previewPricing(storeId, req.params.listingId);
      res.json(preview);
    } catch (err) {
      const status = err.statusCode || (err.message.startsWith('Forbidden') ? 403 : 500);
      res.status(status).json({ error: err.message });
    }
  },

  schedulePricing: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      const validatedData = schedulePricingSchema.parse(req.body);
      const result = await pricingService.schedulePricing(storeId, req.params.listingId, validatedData);
      res.status(201).json(result);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  },

  deleteSchedule: async (req, res) => {
    try {
      const storeId = getAuthorizedStoreId(req);
      await pricingService.deleteSchedule(storeId, req.params.listingId);
      res.json({ success: true });
    } catch (err) {
      const status = err.statusCode || 400;
      res.status(status).json({ error: err.message });
    }
  }
};
