const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/', sellerController.getOrders);
router.get('/:id', sellerController.getOrderById);
router.post('/:id/accept', sellerController.acceptOrder);
router.post('/:id/pack', sellerController.packOrder);
router.post('/:id/ship', sellerController.shipOrder);
router.post('/:id/cancel', sellerController.cancelOrder);

module.exports = router;
