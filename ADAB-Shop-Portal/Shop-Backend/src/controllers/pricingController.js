const pricingService = require('../services/pricingService');
const { bulkPricingUpdateSchema, pricingUpdateSchema, schedulePricingSchema } = require('../dtos/pricingDto');

module.exports = {
  getPricing: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const schedules = await pricingService.fetchPricing(storeId);
      res.json(schedules);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  updateBulkPricing: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const validatedData = bulkPricingUpdateSchema.parse(req.body);
      const result = await pricingService.applyBulkPricing(storeId, validatedData.updates);
      res.status(200).json(result);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  updateListingPricing: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const validatedData = pricingUpdateSchema.parse(req.body);
      const listing = await pricingService.updateBasePricing(storeId, req.params.listingId, validatedData);
      res.json(listing);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  getPricingHistory: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      const history = await pricingService.getPricingHistory(storeId);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  previewPricing: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      const preview = await pricingService.previewPricing(storeId, req.params.listingId);
      res.json(preview);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  schedulePricing: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      
      const validatedData = schedulePricingSchema.parse(req.body);
      const result = await pricingService.schedulePricing(storeId, req.params.listingId, validatedData);
      res.status(201).json(result);
    } catch (err) {
      if (err.errors) return res.status(400).json({ error: 'Validation Error', details: err.errors });
      res.status(400).json({ error: err.message });
    }
  },

  deleteSchedule: async (req, res) => {
    try {
      const storeId = req.headers['x-store-id'];
      if (!storeId) return res.status(401).json({ error: 'Store ID required' });
      await pricingService.deleteSchedule(storeId, req.params.listingId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};
