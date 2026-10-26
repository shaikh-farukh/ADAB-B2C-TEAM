const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/seller');
const notificationController = require('../controllers/notification');
const { requireSellerAuth } = require('../middlewares/auth');
const { idempotencyMiddleware } = require('../middlewares/idempotency');

// Public Auth Endpoints (Phone / Email + OTP / PIN)
router.post('/auth/login', sellerController.login);
router.post('/auth/login-otp', sellerController.loginWithOtp);
router.post('/auth/signup', sellerController.signup);
router.post('/auth/send-otp', sellerController.sendOtp);
router.post('/auth/verify-otp', sellerController.verifyOtp);
router.post('/auth/reset-password', sellerController.resetPassword);
router.post('/auth/google', sellerController.googleLogin);

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
router.patch('/b2b-orders/:id/status', idempotencyMiddleware, (req, res) => sellerController.updateB2BOrderStatus(req, res));
router.get('/points', sellerController.getPoints);
router.get('/analytics', sellerController.getAnalytics);
router.get('/nearby-catalog', sellerController.getNearbyCatalog);
router.get('/nearby-stores', sellerController.getNearbyStores);
router.get('/credit-balance', sellerController.getBuyerCreditInfo);
router.get('/purchase-orders', sellerController.getPurchaseOrders);
router.post('/purchase-orders', idempotencyMiddleware, sellerController.createPurchaseOrder);
router.get('/other-store-brands', sellerController.getOtherStoreBrands);
router.post('/other-store-brands/add-to-store', sellerController.addOtherStoreBrandToMyStore);
router.get('/other-store-brands/my-added', sellerController.getMyAddedOtherStoreBrands);
router.get('/other-store-brands/purchased-ready', sellerController.getPurchasedBrandsReadyToPublish);
router.post('/other-store-brands/request-stock', (req, res) => sellerController.requestResaleStock(req, res));
router.get('/other-store-brands/incoming-requests', (req, res) => sellerController.getIncomingResaleRequests(req, res));
router.post('/other-store-brands/requests/:id/approve', (req, res) => sellerController.approveResaleRequest(req, res));
router.post('/other-store-brands/requests/:id/decline', (req, res) => sellerController.declineResaleRequest(req, res));
router.post('/other-store-brands/orders/:id/confirm-pay', idempotencyMiddleware, (req, res) => sellerController.confirmAndPayResaleOrder(req, res));
router.post('/other-store-brands/resellers/:buyerStoreId/toggle-block', (req, res) => sellerController.toggleBlockResellerStore(req, res));
router.get('/brand-distribution-analytics', sellerController.getBrandDistributionAnalytics);
router.post('/listings/:id/toggle-b2b', sellerController.toggleListingB2B);
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

// Store Credit Rules & Limits
router.get('/credit-terms', (req, res) => sellerController.getStoreCreditRules(req, res));
router.put('/credit-terms/give', idempotencyMiddleware, (req, res) => sellerController.updateCreditGiveTerms(req, res));
router.put('/credit-terms/buy', idempotencyMiddleware, (req, res) => sellerController.updateCreditBuyLimits(req, res));


// Phase 2: POS Walk-in Sale Persistence & Stock Deduction
router.post('/pos/sales', idempotencyMiddleware, (req, res) => sellerController.createPOSSale(req, res));

// Phase 2: National FMCG Master Catalog Browser & 1-Click Store Adoption
router.get('/catalog/master', (req, res) => sellerController.getMasterCatalog(req, res));
router.post('/catalog/adopt', idempotencyMiddleware, (req, res) => sellerController.adoptMasterCatalogItem(req, res));

// Phase 2: Bank Credit Applications & Partners
router.get('/finance/bank-partners', (req, res) => sellerController.getBankPartners(req, res));
router.post('/finance/credit-apply', idempotencyMiddleware, (req, res) => sellerController.submitCreditApply(req, res));
router.get('/finance/credit-applications', (req, res) => sellerController.getCreditApplications(req, res));

module.exports = router;




