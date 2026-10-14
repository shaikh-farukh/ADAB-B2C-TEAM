const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const catalogController = require('../controllers/catalogController');

router.get('/:id/reviews', reviewController.getProductReviews);
router.post('/:id/reviews', reviewController.createVerifiedReview);

// Also expose catalog product lookups if accessed via /api/v1/products/:id directly
router.get('/:id', catalogController.getProductById);
router.get('/:id/sellers', catalogController.getProductSellers);
router.get('/:id/related', catalogController.getRelatedProducts);

module.exports = router;
