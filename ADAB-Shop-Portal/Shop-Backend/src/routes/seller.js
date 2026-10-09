const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller');
const notificationController = require('../controllers/notification');
const { requireSellerAuth } = require('../middlewares/auth');

// Apply temporary development authentication
router.use(requireSellerAuth);

// Core Read APIs for Day 1
router.get('/profile', sellerController.getProfile);
router.patch('/profile', sellerController.updateProfile);
router.get('/store', sellerController.getStore);
router.patch('/store', sellerController.updateStore);
router.get('/settings', sellerController.getSettings);
router.patch('/settings', sellerController.updateSettings);
router.get('/dashboard', sellerController.getDashboardMetrics);

// Shared Platform Notification Endpoints (Consumed by Seller UI)
router.get('/notifications', notificationController.getNotifications);
router.get('/notifications/unread-count', notificationController.getUnreadCount);
router.post('/notifications/:id/read', notificationController.markAsRead);
router.post('/notifications/test', notificationController.createTestNotification);

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
router.post('/messages', sellerController.sendMessage);
router.post('/messages/:id/read', sellerController.markMessageRead);
router.get('/finance/summary', sellerController.getFinanceSummary);
router.get('/finance/khata', sellerController.getKhataLedger);

module.exports = router;




