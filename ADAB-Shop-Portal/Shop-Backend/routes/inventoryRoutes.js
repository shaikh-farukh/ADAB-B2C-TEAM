const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');

router.get('/', sellerController.getInventory);
router.get('/low-stock', sellerController.getLowStock);
router.get('/history', sellerController.getInventoryHistory);
router.get('/warehouses', sellerController.getWarehouses);
router.post('/warehouses', sellerController.createWarehouse);
router.get('/transfers', sellerController.getTransfers);
router.post('/transfers', sellerController.createTransfer);
router.post('/adjust', sellerController.adjustInventory);
router.get('/:sku', sellerController.getInventoryBySku);

module.exports = router;
