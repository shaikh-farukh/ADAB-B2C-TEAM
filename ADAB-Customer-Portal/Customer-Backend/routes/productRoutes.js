const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const catalogController = require('../controllers/catalogController');

const deprecatedProductAlias = (canonicalSuffix = '') => (req, res, next) => {
  res.set('Deprecation', 'true');
  res.set('X-Canonical-Endpoint', `/api/v1/catalog/products/:id${canonicalSuffix}`);
  next();
};

router.get('/:id/reviews', deprecatedProductAlias('/reviews'), reviewController.getProductReviews);
router.post('/:id/reviews', deprecatedProductAlias('/reviews'), reviewController.createVerifiedReview);

// Legacy aliases forwarding to canonical /api/v1/catalog/products/:id* handlers
router.get('/:id/sellers', deprecatedProductAlias('/sellers'), catalogController.getProductSellers);
router.get('/:id/related', deprecatedProductAlias('/related'), catalogController.getRelatedProducts);
router.get('/:id', deprecatedProductAlias(''), catalogController.getProductById);

module.exports = router;
