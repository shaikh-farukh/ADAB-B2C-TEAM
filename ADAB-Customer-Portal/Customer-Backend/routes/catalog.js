const express = require('express');
const catalogController = require('../controllers/catalogController');
const catalogService = require('../services/catalogService');
const router = express.Router();

router.get('/recommended', catalogController.getRecommended);
router.get('/suggest', catalogController.getSearchSuggestions);
router.get('/search', catalogController.searchProducts);
router.get('/products/:id', catalogController.getProductById);
router.get('/products/:id/sellers', catalogController.getProductSellers);
router.get('/products/:id/related', catalogController.getRelatedProducts);
router.get('/categories', catalogController.getCategories);
router.get('/categories/:slug/products', catalogController.getProductsByCategory);
router.get('/stores', catalogController.getStores);
router.get('/sellers', catalogController.getStores);
router.get('/sellers/:id', async (req, res) => {
  try {
    const stores = await catalogService.getStores();
    const store = stores.find(s => s.id === req.params.id) || stores[0];
    if (!store) return res.status(404).json({ success: false, message: 'Seller not found' });
    res.json({ success: true, data: store });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/sellers/:id/products', async (req, res) => {
  try {
    const result = await catalogService.searchProducts({ storeId: req.params.id });
    res.json({ success: true, data: Array.isArray(result) ? result : (result.data || []) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/promotions', catalogController.getPromotions);
router.get('/deals', catalogController.getPromotions);
router.get('/deals/:id', async (req, res) => {
  try {
    const promos = await catalogService.getPromotions();
    const deal = promos.find(p => p.id === req.params.id) || promos[0] || { id: req.params.id, title: 'Active Deal' };
    res.json({ success: true, data: deal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/filters', async (req, res) => {
  try {
    const cats = await catalogService.getCategories();
    res.json({
      success: true,
      data: {
        categories: cats,
        priceRanges: [
          { label: 'Under ₹50', min: 0, max: 50 },
          { label: '₹50 to ₹100', min: 50, max: 100 },
          { label: 'Above ₹100', min: 100, max: 1000 }
        ],
        ratings: [4, 3, 2, 1]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
