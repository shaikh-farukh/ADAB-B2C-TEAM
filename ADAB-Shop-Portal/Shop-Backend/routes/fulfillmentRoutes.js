const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/', sellerController.getShipments);
router.get('/:id', sellerController.getShipmentById);
router.get('/:id/tracking', sellerController.getShipmentById);
router.post('/', sellerController.createShipment);
router.post('/:id/tracking', sellerController.addTrackingEvent);

module.exports = router;
