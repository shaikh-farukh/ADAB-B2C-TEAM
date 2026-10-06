const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/', sellerController.getReviews);
router.post('/:id/reply', sellerController.replyReview);

module.exports = router;
