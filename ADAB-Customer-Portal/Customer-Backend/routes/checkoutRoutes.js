const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.post('/preview', checkoutController.previewCheckout);
router.post('/place-order', checkoutController.placeOrder);

module.exports = router;
