const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');

// Promotions
router.get('/promotions', marketingController.getPromotions);
router.post('/promotions', marketingController.createPromotion);
router.patch('/promotions/:id', marketingController.updatePromotion);
router.delete('/promotions/:id', marketingController.deletePromotion);

// Coupons
router.get('/coupons', marketingController.getCoupons);
router.post('/coupons', marketingController.createCoupon);
router.patch('/coupons/:id', marketingController.updateCoupon);

module.exports = router;
