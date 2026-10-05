const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/purchase-orders', sellerController.getPurchaseOrders);
router.post('/purchase-orders', sellerController.createPurchaseOrder);

module.exports = router;
