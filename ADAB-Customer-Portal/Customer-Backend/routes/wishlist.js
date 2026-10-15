const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// Legacy adapter routes forwarding to canonical customerController wishlist actions
router.get('/:userId', (req, res) => {
  req.headers['x-user-id'] = req.params.userId;
  customerController.getWishlist(req, res);
});

router.post('/', (req, res) => {
  if (req.body.userId) req.headers['x-user-id'] = req.body.userId;
  if (req.body.listingId && !req.body.productId) req.body.productId = req.body.listingId;
  customerController.addWishlistItem(req, res);
});

router.delete('/', (req, res) => {
  const id = req.body.itemId || req.body.listingId || req.body.productId;
  req.params.id = id;
  customerController.removeWishlistItem(req, res);
});

router.post('/items/:listingId/move-to-cart/:userId', (req, res) => {
  req.headers['x-user-id'] = req.params.userId;
  req.params.id = req.params.listingId;
  customerController.moveWishlistItemToCart(req, res);
});

module.exports = router;
