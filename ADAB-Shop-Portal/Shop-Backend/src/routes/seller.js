const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller');

// In a real scenario, an auth middleware would be injected here.
// router.use(authMiddleware);

// Core Read APIs for Day 1
router.get('/profile', sellerController.getProfile);
router.get('/store', sellerController.getStore);

// Dynamic Operations: Orders, Returns, B2B, Coupons, Points, Analytics, Catalog, Recommendations, Messages, Finance
router.get('/orders', sellerController.getOrders);
router.patch('/orders/:id/status', sellerController.updateOrderStatus);
router.get('/returns', sellerController.getReturns);
router.get('/b2b-orders', sellerController.getB2BOrders);
router.get('/coupons', sellerController.getCoupons);
router.get('/points', sellerController.getPoints);
router.get('/analytics', sellerController.getAnalytics);
router.get('/nearby-catalog', sellerController.getNearbyCatalog);
router.get('/recommendations', sellerController.getRecommendations);
router.get('/messages', sellerController.getMessages);
router.get('/finance/summary', sellerController.getFinanceSummary);
router.get('/finance/khata', sellerController.getKhataLedger);

module.exports = router;




