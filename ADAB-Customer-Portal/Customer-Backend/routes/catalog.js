const express = require('express');
const catalogController = require('../controllers/catalogController');
const router = express.Router();

router.get('/recommended', catalogController.getRecommended);
router.get('/search', catalogController.searchProducts);
router.get('/categories', catalogController.getCategories);
router.get('/categories/:slug/products', catalogController.getProductsByCategory);
router.get('/stores', catalogController.getStores);
module.exports = router;
