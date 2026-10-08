const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');

router.get('/', pricingController.getPricing);
router.post('/bulk', pricingController.updateBulkPricing);
router.patch('/:listingId', pricingController.updateListingPricing);
router.get('/history', pricingController.getPricingHistory);
router.get('/:listingId/preview', pricingController.previewPricing);
router.post('/:listingId/schedule', pricingController.schedulePricing);
router.delete('/:listingId/schedule', pricingController.deleteSchedule);

module.exports = router;
