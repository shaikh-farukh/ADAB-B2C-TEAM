const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

const deprecatedWishlistAlias = (canonicalEndpoint) => (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('X-Canonical-Endpoint', canonicalEndpoint);
  next();
};

// Legacy adapter routes forwarding to canonical customerController wishlist actions
router.get('/:userId', deprecatedWishlistAlias('/api/v1/customers/me/wishlist'), (req, res) => {
  req.headers['x-user-id'] = req.params.userId;
  customerController.getWishlist(req, res);
});

router.post('/', deprecatedWishlistAlias('/api/v1/customers/me/wishlist/items'), (req, res) => {
  if (req.body.userId) req.headers['x-user-id'] = req.body.userId;
  if (req.body.listingId && !req.body.productId) req.body.productId = req.body.listingId;
  customerController.addWishlistItem(req, res);
});

router.delete('/', deprecatedWishlistAlias('/api/v1/customers/me/wishlist/items/:id'), (req, res) => {
  if (req.body?.userId && !req.headers['x-user-id']) req.headers['x-user-id'] = req.body.userId;
  const id = req.body.itemId || req.body.listingId || req.body.productId;
  req.params.id = id;
  customerController.removeWishlistItem(req, res);
});

router.post('/items/:listingId/move-to-cart/:userId', deprecatedWishlistAlias('/api/v1/customers/me/wishlist/items/:id/move-to-cart'), (req, res) => {
  req.headers['x-user-id'] = req.params.userId;
  req.params.id = req.params.listingId;
  customerController.moveWishlistItemToCart(req, res);
});

module.exports = router;
