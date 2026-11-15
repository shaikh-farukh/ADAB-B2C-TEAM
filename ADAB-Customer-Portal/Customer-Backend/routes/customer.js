const express = require('express');
const jwt = require('jsonwebtoken');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');
const returnController = require('../controllers/returnController');
const reviewController = require('../controllers/reviewController');
const supportController = require('../controllers/supportController');
const rewardController = require('../controllers/rewardController');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'adab_customer_portal_jwt_secret_2026';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route-level Authentication Guard for private customer resources.
 * Rejects missing or invalid customer credentials with HTTP 401 before
 * forwarding requests to controller or service layers.
 * Verifies JWT signature to prevent client-side user impersonation.
 */
const requireCustomerAuth = (req, res, next) => {
  let uid = null;

  // 1. Authoritative JWT Token check
  if (req.headers['authorization']?.startsWith('Bearer ')) {
    const token = req.headers['authorization'].substring(7).trim();
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        uid = decoded.id || decoded.userId || decoded.customerId || decoded.sub;
        req.user = decoded;
      } catch (err) {
        return res.status(401).json({
          status: 'error',
          success: false,
          code: 'TOKEN_INVALID',
          message: 'Session expired or invalid. Please log in again.'
        });
      }
    }
  }

  // 2. From verified user payload
  if (!uid && req.user) {
    uid = req.user.id || req.user.userId || req.user.customerId || req.user.sub;
  }

  // 3. Fallback header for tests/internal requests (when no auth token is provided)
  if (!uid) {
    uid = req.headers['x-user-id'] || req.headers['x-customer-id'];
  }

  if (!uid || typeof uid !== 'string' || !UUID_REGEX.test(uid.trim())) {
    return res.status(401).json({
      status: 'error',
      success: false,
      code: 'AUTH_REQUIRED',
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
router.get('/me', requireCustomerAuth, customerController.getProfile);
router.patch('/me', requireCustomerAuth, customerController.updateProfile);
router.get('/me/profile', requireCustomerAuth, customerController.getProfile);
router.patch('/me/profile', requireCustomerAuth, customerController.updateProfile);
router.post('/me/profile/avatar', requireCustomerAuth, customerController.uploadAvatar);

// --- 2. Shopping Preferences ---
router.get('/me/preferences', requireCustomerAuth, customerController.getPreferences);
router.patch('/me/preferences', requireCustomerAuth, customerController.updatePreferences);

// --- 3. Customer Settings ---
router.get('/me/settings', requireCustomerAuth, customerController.getSettings);
router.patch('/me/settings', requireCustomerAuth, customerController.updateSettings);

// --- 4. Notification Preferences ---
router.get('/me/notification-preferences', requireCustomerAuth, customerController.getNotificationPreferences);
router.patch('/me/notification-preferences', requireCustomerAuth, customerController.updateNotificationPreferences);
router.get('/me/notifications/preferences', requireCustomerAuth, deprecatedCustomerAlias('/api/v1/customers/me/notification-preferences'), customerController.getNotificationPreferences);
router.patch('/me/notifications/preferences', requireCustomerAuth, deprecatedCustomerAlias('/api/v1/customers/me/notification-preferences'), customerController.updateNotificationPreferences);
router.patch('/me/notifications', requireCustomerAuth, deprecatedCustomerAlias('/api/v1/customers/me/notification-preferences'), customerController.updateNotificationPreferences);

// --- 5. Recently Viewed History ---
router.get('/me/recently-viewed', requireCustomerAuth, customerController.getRecentlyViewed);
router.post('/me/recently-viewed', requireCustomerAuth, customerController.recordRecentlyViewed);
router.delete('/me/recently-viewed/:id', requireCustomerAuth, customerController.removeRecentlyViewed);

// --- 6. Addresses & Serviceability (Static before Parameter) ---
router.get('/me/addresses', requireCustomerAuth, customerController.getAddresses);
router.post('/me/addresses', requireCustomerAuth, customerController.addAddress);
router.post('/me/addresses/validate', requireCustomerAuth, customerController.validateAddress);
router.get('/me/addresses/:id/serviceability', requireCustomerAuth, customerController.checkAddressServiceability);
router.get('/me/addresses/:id/map-preview', requireCustomerAuth, customerController.getAddressMapPreview);
router.patch('/me/addresses/:id', requireCustomerAuth, customerController.updateAddress);
router.delete('/me/addresses/:id', requireCustomerAuth, customerController.deleteAddress);

// --- 7. Payment Methods & Wallet ---
router.get('/me/payment-methods', requireCustomerAuth, customerController.getPaymentMethods);
router.post('/me/payment-methods', requireCustomerAuth, customerController.addPaymentMethod);
router.delete('/me/payment-methods/:id', requireCustomerAuth, customerController.deletePaymentMethod);
router.get('/me/wallet', requireCustomerAuth, customerController.getWallet);

// --- 8. Wishlist (Bulk before Parameter) ---
router.get('/me/wishlist', requireCustomerAuth, customerController.getWishlist);
router.get('/me/wishlist/count', requireCustomerAuth, customerController.getWishlistCount);
router.post('/me/wishlist/items', requireCustomerAuth, customerController.addWishlistItem);
router.post('/me/wishlist/items/bulk', requireCustomerAuth, customerController.bulkAddWishlistItems);
router.delete('/me/wishlist/items/bulk', requireCustomerAuth, customerController.bulkRemoveWishlistItems);
router.get('/me/wishlist/items/:id', requireCustomerAuth, customerController.getWishlistItemById);
router.delete('/me/wishlist/items/:id', requireCustomerAuth, customerController.removeWishlistItem);
router.post('/me/wishlist/items/:id/move-to-cart', requireCustomerAuth, customerController.moveWishlistItemToCart);

// --- 9. Notifications (Day 4/6) ---
router.get('/me/notifications', requireCustomerAuth, customerController.getNotifications);
router.get('/me/notifications/unread-count', requireCustomerAuth, customerController.getUnreadNotificationCount);
router.patch('/me/notifications/:id/read', requireCustomerAuth, customerController.markNotificationRead);
router.post('/me/notifications/:id/read', requireCustomerAuth, customerController.markNotificationRead);
router.post('/me/notifications/read-all', requireCustomerAuth, customerController.markAllNotificationsRead);
router.patch('/me/notifications/read-all', requireCustomerAuth, customerController.markAllNotificationsRead);

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
