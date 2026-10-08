const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');

router.get('/', cartController.getCart);
router.post('/items', cartController.addItem);
router.patch('/items/:id', cartController.updateItem);
router.delete('/items/:id', cartController.removeItem);
router.get('/summary', cartController.getCartSummary);

router.post('/validate', cartController.validateCart);

// Coupon endpoints
router.get('/coupons', cartController.getAvailableCoupons);
router.post('/coupon', cartController.applyCoupon);
router.delete('/coupon', cartController.removeCoupon);

// Session merge endpoint (guest cart claim upon login)
router.post('/merge', cartController.mergeCart);

module.exports = router;
