const express = require('express');
const router = express.Router();
const marketingController = require('../controllers/marketingController');
const { requireSellerAuth } = require('../middlewares/auth');

router.use(['/promotions', '/coupons'], requireSellerAuth);

// Promotions
router.get('/promotions', marketingController.getPromotions);
router.post('/promotions', marketingController.createPromotion);
router.post('/promotions/check-overlap', marketingController.checkOverlap);
router.patch(['/promotions/:id', '/promotions/:id/update-promotion'], marketingController.updatePromotion);
router.delete(['/promotions/:id', '/promotions/:id/delete-promotion'], marketingController.deletePromotion);

// Coupons
router.get('/coupons', marketingController.getCoupons);
router.post('/coupons', marketingController.createCoupon);
router.patch(['/coupons/:id', '/coupons/:id/update-coupon'], marketingController.updateCoupon);

module.exports = router;
