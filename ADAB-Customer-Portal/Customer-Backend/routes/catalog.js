const express = require('express');
const catalogController = require('../controllers/catalogController');
const router = express.Router();

router.get('/recommended', catalogController.getRecommended);
router.get('/suggest', catalogController.getSearchSuggestions);
router.get('/search', catalogController.searchProducts);
router.get('/products/:id', catalogController.getProductById);
router.get('/products/:id/sellers', catalogController.getProductSellers);
router.get('/products/:id/related', catalogController.getRelatedProducts);
router.get('/categories', catalogController.getCategories);
router.get('/categories/:slug/products', catalogController.getProductsByCategory);
router.get('/stores', catalogController.getStores);
router.get('/stores/:id', catalogController.getStoreById);
router.get('/stores/:id/products', catalogController.getStoreProducts);
router.get('/promotions', catalogController.getPromotions);
module.exports = router;
