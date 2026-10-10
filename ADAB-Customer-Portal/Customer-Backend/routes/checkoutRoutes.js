const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');
const { idempotencyMiddleware } = require('../middleware/idempotency');

router.post('/preview', checkoutController.previewCheckout);
router.get('/delivery-slots', checkoutController.getDeliverySlots);
router.get('/serviceability', checkoutController.checkServiceability);
router.post('/serviceability', checkoutController.checkServiceability);
router.post('/payment-intent', idempotencyMiddleware(), checkoutController.createPaymentIntent);
router.post('/place-order', idempotencyMiddleware(), checkoutController.placeOrder);

module.exports = router;

