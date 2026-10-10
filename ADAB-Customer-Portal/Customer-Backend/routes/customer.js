const express = require('express');
const customerController = require('../controllers/customerController');
const router = express.Router();

router.get('/me', customerController.getProfile);
router.patch('/me', customerController.updateProfile);
router.get('/me/addresses', customerController.getAddresses);
router.post('/me/addresses', customerController.addAddress);
router.patch('/me/addresses/:id', customerController.updateAddress);
router.delete('/me/addresses/:id', customerController.deleteAddress);
router.get('/me/payment-methods', customerController.getPaymentMethods);
router.post('/me/payment-methods', customerController.addPaymentMethod);
router.delete('/me/payment-methods/:id', customerController.deletePaymentMethod);
router.get('/me/wallet', customerController.getWallet);
router.get('/me/wishlist', customerController.getWishlist);
router.post('/me/wishlist/items', customerController.addWishlistItem);
router.delete('/me/wishlist/items/:id', customerController.removeWishlistItem);

module.exports = router;

