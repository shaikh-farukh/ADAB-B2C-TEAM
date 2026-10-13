const express = require('express');
const customerController = require('../controllers/customerController');
const router = express.Router();

router.get('/me', customerController.getProfile);
router.patch('/me', customerController.updateProfile);
router.get('/me/notifications', customerController.getNotificationPreferences);
router.patch('/me/notifications', customerController.updateNotificationPreferences);
router.get('/me/notification-preferences', customerController.getNotificationPreferences);
router.patch('/me/notification-preferences', customerController.updateNotificationPreferences);
router.get('/me/settings', customerController.getNotificationPreferences);
router.patch('/me/settings', customerController.updateNotificationPreferences);
router.get('/me/addresses', customerController.getAddresses);
router.post('/me/addresses', customerController.addAddress);
router.patch('/me/addresses/:id', customerController.updateAddress);
router.delete('/me/addresses/:id', customerController.deleteAddress);
router.get('/me/addresses/:id/serviceability', customerController.checkAddressServiceability);
router.get('/me/wishlist', customerController.getWishlist);
router.get('/me/wishlist/count', customerController.getWishlistCount);
router.post('/me/wishlist/items', customerController.addWishlistItem);
router.delete('/me/wishlist/items/:id', customerController.removeWishlistItem);
router.post('/me/wishlist/items/:id/move-to-cart', customerController.moveWishlistItemToCart);

module.exports = router;
