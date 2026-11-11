const express = require('express');
const router = express.Router();
const CatalogController = require('../controllers/catalog');

// Category Hierarchy & Inheritance
router.get('/categories/tree', CatalogController.getCategoryTree);
router.get('/categories/:id/attributes', CatalogController.getCategoryAttributes);

// Sourcing & Catalog Lookup
router.get('/master/search', CatalogController.searchMasterCatalog);
router.get('/b2b/products', CatalogController.getB2BProducts);
router.get('/barcode/:barcode', CatalogController.lookupBarcode);

module.exports = router;

