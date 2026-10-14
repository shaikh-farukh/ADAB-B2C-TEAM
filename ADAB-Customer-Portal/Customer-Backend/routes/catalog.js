const express = require('express');
const catalogController = require('../controllers/catalogController');
const router = express.Router();

// --- 1. Top-Level Discovery & Search ---
router.get('/products', catalogController.getProducts);
router.get('/search', catalogController.searchProducts);
router.get('/search/suggestions', catalogController.getSearchSuggestions);
router.get('/search/filters', catalogController.getSearchFilters);
router.get('/search/popular', catalogController.getPopularSearches);
router.post('/search/feedback', catalogController.recordSearchFeedback);

// --- 2. Filter Facets & Home Aggregation ---
router.get('/filters', catalogController.getFilters);
router.get('/home', catalogController.getHome);
router.get('/recommended', catalogController.getRecommended);

// --- 3. Categories Hierarchy & Taxonomy ---
router.get('/categories', catalogController.getCategories);
router.get('/categories/tree', catalogController.getCategoryTree);
router.get('/categories/:id/children', catalogController.getCategoryChildren);
router.get('/categories/:slug/products', catalogController.getProductsByCategory);

// --- 4. Brands ---
router.get('/brands', catalogController.getBrands);
router.get('/brands/:slug/products', catalogController.getBrandProducts);

// --- 5. Deals & Promotions ---
router.get('/deals', catalogController.getDeals);
router.get('/deals/featured', catalogController.getFeaturedDeals);
router.get('/deals/categories', catalogController.getDealCategories);
router.get('/deals/:id', catalogController.getDealById);

// --- 6. Sellers & Storefronts ---
router.get('/sellers', catalogController.getSellers);
router.get('/sellers/:id/products', catalogController.getSellerProducts);
router.get('/sellers/:id/summary', catalogController.getSellerSummary);
router.get('/sellers/:id/ratings', catalogController.getSellerRatings);
router.get('/sellers/:id/reviews', catalogController.getSellerReviews);
router.get('/sellers/:id', catalogController.getSellerById);

// --- 7. Granular Product Details (PDP) ---
router.get('/products/:id/sellers', catalogController.getProductSellers);
router.get('/products/:id/related', catalogController.getRelatedProducts);
router.get('/products/:id/availability', catalogController.getProductAvailability);
router.get('/products/:id/variants', catalogController.getProductVariants);
router.get('/products/:id/price', catalogController.getProductPrice);
router.get('/products/:id/media', catalogController.getProductMedia);
router.get('/products/:id/specifications', catalogController.getProductSpecifications);
router.get('/products/:id/frequently-bought-together', catalogController.getFrequentlyBoughtTogether);
router.get('/products/:id', catalogController.getProductById);

module.exports = router;
