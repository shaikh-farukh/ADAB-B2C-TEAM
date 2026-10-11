const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller');
const notificationController = require('../controllers/notification');
const { requireSellerAuth } = require('../middlewares/auth');

// Public Auth Endpoints (Phone + 6-digit PIN)
router.post('/auth/login', sellerController.login);
router.post('/auth/signup', sellerController.signup);

// Apply Seller Auth Middleware
router.use(requireSellerAuth);

// 7-Step Incremental KYC Onboarding APIs
router.get('/onboarding', sellerController.getOnboarding);
router.post('/onboarding/step/:stepNum', sellerController.saveOnboardingStep);

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
router.get('/notifications/since', notificationController.getNotificationsSince);
router.post('/notifications/read-all', notificationController.markAllAsRead);
router.post('/notifications/:id/read', notificationController.markAsRead);

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
router.get('/messages/threads', sellerController.getThreads);
router.get('/messages/threads/:threadId', sellerController.getThreadMessages);
router.post('/messages/threads/:threadId/messages', sellerController.sendThreadMessage);
router.post('/messages/threads/:threadId/read', sellerController.markThreadRead);
router.get('/finance/summary', sellerController.getFinanceSummary);
router.get('/finance/khata', sellerController.getKhataLedger);

module.exports = router;




