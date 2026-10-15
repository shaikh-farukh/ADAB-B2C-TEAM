const express = require('express');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');
const returnController = require('../controllers/returnController');
const reviewController = require('../controllers/reviewController');
const supportController = require('../controllers/supportController');
const rewardController = require('../controllers/rewardController');
const router = express.Router();

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
router.get('/me/notifications/preferences', customerController.getNotificationPreferences);
router.patch('/me/notifications/preferences', customerController.updateNotificationPreferences);
router.patch('/me/notifications', customerController.updateNotificationPreferences);

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
router.get('/me/orders', orderController.getOrders);
router.get('/me/orders/:id', orderController.getOrder);
router.post('/me/orders/:id/cancel', orderController.cancelOrder);
router.post('/me/orders/:id/reorder', orderController.reorderOrder);
router.get('/me/orders/:id/status-history', orderController.getOrderStatusHistory);
router.get('/me/orders/:id/shipments', orderController.getOrderShipments);
router.get('/me/orders/:id/tracking', orderController.getOrderTracking);
router.get('/me/orders/:id/invoice', orderController.getOrderInvoice);
router.patch('/me/orders/:id/status', orderController.updateOrderStatus);
router.post('/me/orders/:id/status', orderController.updateOrderStatus);

// --- 11. Returns & Refunds (Day 5 Task 1 canonical endpoints) ---
router.post('/me/orders/:id/return', returnController.createOrderReturn);
router.get('/me/returns', returnController.getCustomerReturns);
router.get('/me/returns/:id', returnController.getReturnById);
router.post('/me/returns/:id/cancel', returnController.cancelReturn);
router.post('/me/returns/:id/evidence', returnController.uploadReturnEvidence);
router.patch('/me/returns/:id/status', returnController.updateReturnStatus);
router.post('/me/returns/:id/status', returnController.updateReturnStatus);
router.patch('/returns/:id/status', returnController.updateReturnStatus);
router.post('/returns/:id/status', returnController.updateReturnStatus);
router.get('/me/refunds', returnController.getCustomerRefunds);
router.get('/me/refunds/:id', returnController.getRefundById);
router.get('/refunds/:id', returnController.getRefundById);

// --- 12. Verified Reviews (Day 5 Task 2 canonical endpoints) ---
router.get('/me/reviews/pending', reviewController.getPendingReviews);
router.get('/me/reviews', reviewController.getCustomerReviews);
router.post('/me/reviews/:id/media', reviewController.uploadReviewMedia);

// --- 13. Help & Support Tickets (Day 5 Task 3 canonical endpoints) ---
router.post('/me/support/tickets', supportController.createTicket);
router.get('/me/support/tickets', supportController.getCustomerTickets);
router.get('/me/support/tickets/:id', supportController.getTicketDetails);
router.post('/me/support/tickets/:id/messages', supportController.sendTicketMessage);
router.patch('/me/support/tickets/:id', supportController.updateTicketStatus);

// --- 14. Rewards Ledger (Day 5 Task 4 canonical endpoints) ---
router.get('/me/rewards', rewardController.getRewardsSummary);
router.get('/me/rewards/ledger', rewardController.getRewardsLedger);
router.post('/me/rewards/redeem', rewardController.redeemRewardPoints);

module.exports = router;
