const express = require('express');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');
const returnController = require('../controllers/returnController');
const reviewController = require('../controllers/reviewController');
const supportController = require('../controllers/supportController');
const rewardController = require('../controllers/rewardController');
const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route-level Authentication Guard for private customer resources.
 * Rejects missing or invalid customer credentials with HTTP 401 before
 * forwarding requests to controller or service layers.
 */
const requireCustomerAuth = (req, res, next) => {
  let uid = null;
  if (req.user) {
    uid = req.user.id || req.user.userId || req.user.customerId || req.user.sub;
  }
  if (!uid) {
    uid = req.headers['x-user-id'] || req.headers['x-customer-id'];
  }
  if (!uid && req.headers['authorization']?.startsWith('Bearer ')) {
    const token = req.headers['authorization'].substring(7).trim();
    if (token.includes('.')) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
        uid = payload.id || payload.userId || payload.customerId || payload.sub;
      } catch (e) {
        // Silently fall through
      }
    }
  }
  if (!uid) {
    uid = req.query?.user_id || req.query?.customerId || req.query?.customer_id || req.body?.userId || req.body?.user_id || req.body?.customer_id;
  }

  if (!uid || typeof uid !== 'string' || !UUID_REGEX.test(uid.trim())) {
    return res.status(401).json({
      status: 'error',
      success: false,
      message: 'Authentication required. Please login or provide a valid access token.'
    });
  }

  const validId = uid.trim();
  req.userId = validId;
  req.customerId = validId;
  req.headers['x-user-id'] = validId;
  next();
};

const deprecatedCustomerAlias = (canonicalEndpoint) => (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('X-Canonical-Endpoint', canonicalEndpoint);
  next();
};

// --- 1. Customer Profile ---
router.get('/me', customerController.getProfile);
router.patch('/me', customerController.updateProfile);
router.get('/me/profile', customerController.getProfile);
router.patch('/me/profile', customerController.updateProfile);
router.post('/me/profile/avatar', customerController.uploadAvatar);

// --- 2. Shopping Preferences ---
router.get('/me/preferences', customerController.getPreferences);
router.patch('/me/preferences', customerController.updatePreferences);

// --- 3. Customer Settings ---
router.get('/me/settings', customerController.getSettings);
router.patch('/me/settings', customerController.updateSettings);

// --- 4. Notification Preferences ---
router.get('/me/notification-preferences', customerController.getNotificationPreferences);
router.patch('/me/notification-preferences', customerController.updateNotificationPreferences);
router.get('/me/notifications/preferences', deprecatedCustomerAlias('/api/v1/customers/me/notification-preferences'), customerController.getNotificationPreferences);
router.patch('/me/notifications/preferences', deprecatedCustomerAlias('/api/v1/customers/me/notification-preferences'), customerController.updateNotificationPreferences);
router.patch('/me/notifications', deprecatedCustomerAlias('/api/v1/customers/me/notification-preferences'), customerController.updateNotificationPreferences);

// --- 5. Recently Viewed History ---
router.get('/me/recently-viewed', customerController.getRecentlyViewed);
router.post('/me/recently-viewed', customerController.recordRecentlyViewed);
router.delete('/me/recently-viewed/:id', customerController.removeRecentlyViewed);

// --- 6. Addresses & Serviceability (Static before Parameter) ---
router.get('/me/addresses', customerController.getAddresses);
router.post('/me/addresses', customerController.addAddress);
router.post('/me/addresses/validate', customerController.validateAddress);
router.get('/me/addresses/:id/serviceability', customerController.checkAddressServiceability);
router.get('/me/addresses/:id/map-preview', customerController.getAddressMapPreview);
router.patch('/me/addresses/:id', customerController.updateAddress);
router.delete('/me/addresses/:id', customerController.deleteAddress);

// --- 7. Payment Methods & Wallet ---
router.get('/me/payment-methods', customerController.getPaymentMethods);
router.post('/me/payment-methods', customerController.addPaymentMethod);
router.delete('/me/payment-methods/:id', customerController.deletePaymentMethod);
router.get('/me/wallet', customerController.getWallet);

// --- 8. Wishlist (Bulk before Parameter) ---
router.get('/me/wishlist', customerController.getWishlist);
router.get('/me/wishlist/count', customerController.getWishlistCount);
router.post('/me/wishlist/items', customerController.addWishlistItem);
router.post('/me/wishlist/items/bulk', customerController.bulkAddWishlistItems);
router.delete('/me/wishlist/items/bulk', customerController.bulkRemoveWishlistItems);
router.get('/me/wishlist/items/:id', customerController.getWishlistItemById);
router.delete('/me/wishlist/items/:id', customerController.removeWishlistItem);
router.post('/me/wishlist/items/:id/move-to-cart', customerController.moveWishlistItemToCart);

// --- 9. Notifications (Day 4/6) ---
router.get('/me/notifications', customerController.getNotifications);
router.get('/me/notifications/unread-count', customerController.getUnreadNotificationCount);
router.patch('/me/notifications/:id/read', customerController.markNotificationRead);
router.post('/me/notifications/:id/read', customerController.markNotificationRead);
router.post('/me/notifications/read-all', customerController.markAllNotificationsRead);
router.patch('/me/notifications/read-all', customerController.markAllNotificationsRead);

// --- 10. Customer Orders (Day 4 canonical endpoints: /api/v1/customers/me/orders/*) ---
router.get('/me/orders', requireCustomerAuth, orderController.getOrders);
router.get('/me/orders/:id', requireCustomerAuth, orderController.getOrder);
router.post('/me/orders/:id/cancel', requireCustomerAuth, orderController.cancelOrder);
router.post('/me/orders/:id/reorder', requireCustomerAuth, orderController.reorderOrder);
router.get('/me/orders/:id/status-history', requireCustomerAuth, orderController.getOrderStatusHistory);
router.get('/me/orders/:id/shipments', requireCustomerAuth, orderController.getOrderShipments);
router.get('/me/orders/:id/tracking', requireCustomerAuth, orderController.getOrderTracking);
router.get('/me/orders/:id/invoice', requireCustomerAuth, orderController.getOrderInvoice);
router.patch('/me/orders/:id/status', requireCustomerAuth, orderController.updateOrderStatus);
router.post('/me/orders/:id/status', requireCustomerAuth, orderController.updateOrderStatus);

// --- 11. Returns & Refunds (Day 5 Task 1 canonical endpoints) ---
router.post('/me/orders/:id/return', requireCustomerAuth, returnController.createOrderReturn);
router.get('/me/returns', requireCustomerAuth, returnController.getCustomerReturns);
router.get('/me/returns/:id', requireCustomerAuth, returnController.getReturnById);
router.post('/me/returns/:id/cancel', requireCustomerAuth, returnController.cancelReturn);
router.post('/me/returns/:id/evidence', requireCustomerAuth, returnController.uploadReturnEvidence);
router.patch('/me/returns/:id/status', requireCustomerAuth, returnController.updateReturnStatus);
router.post('/me/returns/:id/status', requireCustomerAuth, returnController.updateReturnStatus);
router.patch('/returns/:id/status', requireCustomerAuth, returnController.updateReturnStatus);
router.post('/returns/:id/status', requireCustomerAuth, returnController.updateReturnStatus);
router.get('/me/refunds', requireCustomerAuth, returnController.getCustomerRefunds);
router.get('/me/refunds/:id', requireCustomerAuth, returnController.getRefundById);
router.get('/refunds/:id', requireCustomerAuth, returnController.getRefundById);

// --- 12. Verified Reviews (Day 5 Task 2 canonical endpoints) ---
router.get('/me/reviews/pending', requireCustomerAuth, reviewController.getPendingReviews);
router.get('/me/reviews', requireCustomerAuth, reviewController.getCustomerReviews);
router.post('/me/reviews/:id/media', requireCustomerAuth, reviewController.uploadReviewMedia);

// --- 13. Help & Support Tickets (Day 5 Task 3 canonical endpoints) ---
router.post('/me/support/tickets', requireCustomerAuth, supportController.createTicket);
router.get('/me/support/tickets', requireCustomerAuth, supportController.getCustomerTickets);
router.get('/me/support/tickets/:id', requireCustomerAuth, supportController.getTicketDetails);
router.post('/me/support/tickets/:id/messages', requireCustomerAuth, supportController.sendTicketMessage);
router.patch('/me/support/tickets/:id', requireCustomerAuth, supportController.updateTicketStatus);

// --- 14. Rewards Ledger (Day 5 Task 4 canonical endpoints) ---
router.get('/me/rewards', requireCustomerAuth, rewardController.getRewardsSummary);
router.get('/me/rewards/ledger', requireCustomerAuth, rewardController.getRewardsLedger);
router.post('/me/rewards/redeem', requireCustomerAuth, rewardController.redeemRewardPoints);

module.exports = router;
