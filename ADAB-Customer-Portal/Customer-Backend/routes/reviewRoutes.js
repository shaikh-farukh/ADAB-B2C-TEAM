const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

router.patch('/:id', reviewController.updateReview);
router.post('/:id/media', reviewController.uploadReviewMedia);

module.exports = router;
