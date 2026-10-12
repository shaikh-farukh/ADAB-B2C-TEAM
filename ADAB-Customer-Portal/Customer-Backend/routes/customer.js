const express = require('express');
const customerController = require('../controllers/customerController');
const orderController = require('../controllers/orderController');
const router = express.Router();

// Profile & Settings
router.get('/me', customerController.getProfile);
// Notification Preferences
router.get('/me/notification-preferences', customerController.getNotificationPreferences);
router.patch('/me/notification-preferences', customerController.updateNotificationPreferences);
router.get('/me/notifications/preferences', customerController.getNotificationPreferences);
router.patch('/me/notifications/preferences', customerController.updateNotificationPreferences);
router.patch('/me/notifications', customerController.updateNotificationPreferences);

// Addresses
router.get('/me/addresses', customerController.getAddresses);
router.post('/me/addresses', customerController.addAddress);
router.patch('/me/addresses/:id', customerController.updateAddress);
router.delete('/me/addresses/:id', customerController.deleteAddress);

// Payment Methods & Wallet
router.get('/me/payment-methods', customerController.getPaymentMethods);
router.post('/me/payment-methods', customerController.addPaymentMethod);
router.delete('/me/payment-methods/:id', customerController.deletePaymentMethod);
router.get('/me/wallet', customerController.getWallet);

// Wishlist
router.get('/me/wishlist', customerController.getWishlist);
router.post('/me/wishlist/items', customerController.addWishlistItem);
router.delete('/me/wishlist/items/:id', customerController.removeWishlistItem);

// Notifications (Day 4)
router.get('/me/notifications', customerController.getNotifications);
router.get('/me/notifications/unread-count', customerController.getUnreadNotificationCount);
router.patch('/me/notifications/:id/read', customerController.markNotificationRead);
router.post('/me/notifications/read-all', customerController.markAllNotificationsRead);

// Customer Orders (Day 4 canonical endpoints: /api/v1/customers/me/orders/*)
router.get('/me/orders', orderController.getOrders);
router.get('/me/orders/:id', orderController.getOrder);
router.post('/me/orders/:id/cancel', orderController.cancelOrder);
router.post('/me/orders/:id/reorder', orderController.reorderOrder);
router.get('/me/orders/:id/status-history', orderController.getOrderStatusHistory);
router.get('/me/orders/:id/shipments', orderController.getOrderShipments);
router.get('/me/orders/:id/tracking', orderController.getOrderTracking);
router.get('/me/orders/:id/invoice', orderController.getOrderInvoice);

module.exports = router;


