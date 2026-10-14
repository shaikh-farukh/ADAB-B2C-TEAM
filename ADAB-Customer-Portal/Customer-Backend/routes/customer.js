const express = require('express');
const customerController = require('../controllers/customerController');
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

// --- 7. Wishlist (Bulk before Parameter) ---
router.get('/me/wishlist', customerController.getWishlist);
router.get('/me/wishlist/count', customerController.getWishlistCount);
router.post('/me/wishlist/items', customerController.addWishlistItem);
router.post('/me/wishlist/items/bulk', customerController.bulkAddWishlistItems);
router.delete('/me/wishlist/items/bulk', customerController.bulkRemoveWishlistItems);
router.get('/me/wishlist/items/:id', customerController.getWishlistItemById);
router.delete('/me/wishlist/items/:id', customerController.removeWishlistItem);
router.post('/me/wishlist/items/:id/move-to-cart', customerController.moveWishlistItemToCart);

module.exports = router;
