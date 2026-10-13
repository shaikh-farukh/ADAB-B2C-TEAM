const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller');
const notificationController = require('../controllers/notification');
const { requireSellerAuth } = require('../middlewares/auth');
const { idempotencyMiddleware } = require('../middlewares/idempotency');

// Public Auth Endpoints (Phone / Email + OTP / PIN)
router.post('/auth/login', sellerController.login);
router.post('/auth/signup', sellerController.signup);
router.post('/auth/send-otp', sellerController.sendOtp);
router.post('/auth/verify-otp', sellerController.verifyOtp);

// Idempotent Webhook Callback Endpoint
router.post('/webhooks/callback', idempotencyMiddleware, (req, res) => sellerController.handleWebhookCallback(req, res));

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
router.patch('/orders/:id/status', idempotencyMiddleware, sellerController.updateOrderStatus);
router.get('/returns', sellerController.getReturns);
router.patch('/returns/:id/status', idempotencyMiddleware, sellerController.updateReturnStatus);
router.get('/b2b-orders', sellerController.getB2BOrders);
router.get('/points', sellerController.getPoints);
router.get('/analytics', sellerController.getAnalytics);
router.get('/nearby-catalog', sellerController.getNearbyCatalog);
router.get('/nearby-stores', sellerController.getNearbyStores);
router.get('/credit-balance', sellerController.getBuyerCreditInfo);
router.get('/purchase-orders', sellerController.getPurchaseOrders);
router.get('/other-store-brands', sellerController.getOtherStoreBrands);
router.post('/other-store-brands/add-to-store', sellerController.addOtherStoreBrandToMyStore);
router.get('/other-store-brands/my-added', sellerController.getMyAddedOtherStoreBrands);
router.get('/recommendations', sellerController.getRecommendations);
router.get('/messages/threads', sellerController.getThreads);
router.get('/messages/threads/:threadId', sellerController.getThreadMessages);
router.post('/messages/threads/:threadId/messages', sellerController.sendThreadMessage);
router.post('/messages/threads/:threadId/read', sellerController.markThreadRead);
router.get('/finance/summary', (req, res) => sellerController.getFinanceSummary(req, res));
router.get('/finance/transactions', (req, res) => sellerController.getFinanceTransactions(req, res));
router.get('/finance/settlements', (req, res) => sellerController.getFinanceSettlements(req, res));
router.post('/finance/withdraw', idempotencyMiddleware, (req, res) => sellerController.createWithdrawalSettlement(req, res));
router.get('/finance/khata', (req, res) => sellerController.getKhataLedger(req, res));
router.post('/finance/khata/:id/pay', idempotencyMiddleware, (req, res) => sellerController.payKhataOrder(req, res));

module.exports = router;




