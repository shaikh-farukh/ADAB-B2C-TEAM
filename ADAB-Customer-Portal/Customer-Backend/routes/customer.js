const express = require('express');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');
const returnController = require('../controllers/returnController');
const reviewController = require('../controllers/reviewController');
const supportController = require('../controllers/supportController');
const rewardController = require('../controllers/rewardController');
const router = express.Router();

// Profile & Settings
router.get('/me', customerController.getProfile);
// Notification Preferences
router.get('/me/notification-preferences', customerController.getNotificationPreferences);
router.patch('/me/notification-preferences', customerController.updateNotificationPreferences);
router.get('/me/notifications/preferences', customerController.getNotificationPreferences);
router.patch('/me/notifications/preferences', customerController.updateNotificationPreferences);
router.patch('/me/notifications', customerController.updateNotificationPreferences);
// Settings aliases
router.get('/me/settings', customerController.getNotificationPreferences);
router.patch('/me/settings', customerController.updateNotificationPreferences);

// Addresses
router.get('/me/addresses', customerController.getAddresses);
router.post('/me/addresses', customerController.addAddress);
router.patch('/me/addresses/:id', customerController.updateAddress);
router.delete('/me/addresses/:id', customerController.deleteAddress);
router.get('/me/addresses/:id/serviceability', customerController.checkAddressServiceability);

// Payment Methods & Wallet
router.get('/me/payment-methods', customerController.getPaymentMethods);
router.post('/me/payment-methods', customerController.addPaymentMethod);
router.delete('/me/payment-methods/:id', customerController.deletePaymentMethod);
router.get('/me/wallet', customerController.getWallet);

// Wishlist
router.get('/me/wishlist', customerController.getWishlist);
router.get('/me/wishlist/count', customerController.getWishlistCount);
router.post('/me/wishlist/items', customerController.addWishlistItem);
router.delete('/me/wishlist/items/:id', customerController.removeWishlistItem);
router.post('/me/wishlist/items/:id/move-to-cart', customerController.moveWishlistItemToCart);

// Notifications (Day 4)
router.get('/me/notifications', customerController.getNotifications);
router.get('/me/notifications/unread-count', customerController.getUnreadNotificationCount);
router.patch('/me/notifications/:id/read', customerController.markNotificationRead);
router.post('/me/notifications/:id/read', customerController.markNotificationRead);
router.post('/me/notifications/read-all', customerController.markAllNotificationsRead);
router.patch('/me/notifications/read-all', customerController.markAllNotificationsRead);

// Customer Orders (Day 4 canonical endpoints: /api/v1/customers/me/orders/*)
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

// Returns & Refunds (Day 5 Task 1 canonical endpoints)
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


// Verified Reviews (Day 5 Task 2 canonical endpoints)
router.get('/me/reviews/pending', reviewController.getPendingReviews);
router.get('/me/reviews', reviewController.getCustomerReviews);
router.post('/me/reviews/:id/media', reviewController.uploadReviewMedia);

// Help & Support Tickets (Day 5 Task 3 canonical endpoints)
router.post('/me/support/tickets', supportController.createTicket);
router.get('/me/support/tickets', supportController.getCustomerTickets);
router.get('/me/support/tickets/:id', supportController.getTicketDetails);
router.post('/me/support/tickets/:id/messages', supportController.sendTicketMessage);
router.patch('/me/support/tickets/:id', supportController.updateTicketStatus);

// Rewards Ledger (Day 5 Task 4 canonical endpoints)
router.get('/me/rewards', rewardController.getRewardsSummary);
router.get('/me/rewards/ledger', rewardController.getRewardsLedger);
router.post('/me/rewards/redeem', rewardController.redeemRewardPoints);

module.exports = router;


