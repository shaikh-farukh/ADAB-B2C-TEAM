const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');

// Wishlist endpoints
router.post('/', wishlistController.addItem);
router.delete('/', wishlistController.removeItem);
router.get('/:userId', wishlistController.getWishlist);

module.exports = router;
