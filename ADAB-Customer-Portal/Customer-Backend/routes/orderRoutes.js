const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const returnController = require('../controllers/returnController');

router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrder);
router.post('/:id/cancel', orderController.cancelOrder);
router.post('/:id/reorder', orderController.reorderOrder);
router.post('/:id/return', returnController.createOrderReturn);
router.get('/:id/status-history', orderController.getOrderStatusHistory);
router.get('/:id/shipments', orderController.getOrderShipments);
router.get('/:id/tracking', orderController.getOrderTracking);
router.get('/:id/invoice', orderController.getOrderInvoice);

module.exports = router;

