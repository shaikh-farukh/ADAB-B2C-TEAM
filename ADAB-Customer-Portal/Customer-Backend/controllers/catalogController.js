const catalogService = require('../services/catalogService');

// 1. GET /api/v1/catalog/products
exports.getProducts = async (req, res) => {
  try {
    const data = await catalogService.getProducts(req.query);
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. GET /api/v1/catalog/products/:id
exports.getProductById = async (req, res) => {
  try {
    const data = await catalogService.getProductById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. GET /api/v1/catalog/products/:id/sellers
exports.getProductSellers = async (req, res) => {
  try {
    const data = await catalogService.getProductSellers(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. GET /api/v1/catalog/products/:id/related
exports.getRelatedProducts = async (req, res) => {
  try {
    const data = await catalogService.getRelatedProducts(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. GET /api/v1/catalog/products/:id/availability
exports.getProductAvailability = async (req, res) => {
  try {
    const data = await catalogService.getProductAvailability(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 6. GET /api/v1/catalog/products/:id/variants
exports.getProductVariants = async (req, res) => {
  try {
    const data = await catalogService.getProductVariants(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 7. GET /api/v1/catalog/products/:id/price
exports.getProductPrice = async (req, res) => {
  try {
    const data = await catalogService.getProductPrice(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 8. GET /api/v1/catalog/products/:id/media
exports.getProductMedia = async (req, res) => {
  try {
    const data = await catalogService.getProductMedia(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 9. GET /api/v1/catalog/products/:id/specifications
exports.getProductSpecifications = async (req, res) => {
  try {
    const data = await catalogService.getProductSpecifications(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 10. GET /api/v1/catalog/products/:id/frequently-bought-together
exports.getFrequentlyBoughtTogether = async (req, res) => {
  try {
    const data = await catalogService.getFrequentlyBoughtTogether(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 11. GET /api/v1/catalog/search
exports.searchProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {
      q: req.query.q || '',
      category: req.query.category || null,
      categories: req.query.categories ? req.query.categories.split(',') : [],
      storeId: req.query.storeId || req.query.store || null,
      storeName: req.query.storeName || null,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
      brand: req.query.brand || null,
      minRating: req.query.minRating ? parseFloat(req.query.minRating) : null,
      inStockOnly: req.query.inStockOnly === 'true',
      sortOrder: req.query.sortOrder || null,
      sortBy: req.query.sortBy || 'relevance',
      store_id: req.query.store_id || req.query.storeId || null,
      page,
      limit
    };

    const result = await catalogService.searchProducts(filters);
    const data = Array.isArray(result) ? result : (result.data || []);
    const total = result.total !== undefined ? result.total : data.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    res.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 12. GET /api/v1/catalog/search/suggestions
exports.getSearchSuggestions = async (req, res) => {
  try {
    const q = req.query.q || '';
    const data = await catalogService.getSearchSuggestions(q);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 13. GET /api/v1/catalog/search/filters
exports.getSearchFilters = async (req, res) => {
  try {
    const data = await catalogService.getSearchFilters();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 14. GET /api/v1/catalog/search/popular
exports.getPopularSearches = async (req, res) => {
  try {
    const data = await catalogService.getPopularSearches();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 15. POST /api/v1/catalog/search/feedback
exports.recordSearchFeedback = async (req, res) => {
  try {
    const data = await catalogService.recordSearchFeedback(req.body);
    res.json({ success: true, message: 'Search feedback recorded', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 16. GET /api/v1/catalog/filters
exports.getFilters = async (req, res) => {
  try {
    const data = await catalogService.getFilters();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 17. GET /api/v1/catalog/categories
exports.getCategories = async (req, res) => {
  try {
    const data = await catalogService.getCategories();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 18. GET /api/v1/catalog/categories/tree
exports.getCategoryTree = async (req, res) => {
  try {
    const data = await catalogService.getCategoryTree();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 19. GET /api/v1/catalog/categories/:id/children
exports.getCategoryChildren = async (req, res) => {
  try {
    const data = await catalogService.getCategoryChildren(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 20. GET /api/v1/catalog/categories/:slug/products
exports.getProductsByCategory = async (req, res) => {
  try {
    const data = await catalogService.getProductsByCategory(req.params.slug);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 21. GET /api/v1/catalog/brands
exports.getBrands = async (req, res) => {
  try {
    const data = await catalogService.getBrands();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStoreById = async (req, res) => {
  try {
    const data = await catalogService.getStoreById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Store not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStoreProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const result = await catalogService.getStoreProducts(req.params.id, page, limit);
    const data = Array.isArray(result) ? result : (result.data || []);
    const total = result.total !== undefined ? result.total : data.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    res.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPromotions = async (req, res) => {
  try {
    const data = await catalogService.getPromotions();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 22. GET /api/v1/catalog/brands/:slug/products
exports.getBrandProducts = async (req, res) => {
  try {
    const data = await catalogService.getBrandProducts(req.params.slug);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 23. GET /api/v1/catalog/home
exports.getHome = async (req, res) => {
  try {
    const data = await catalogService.getHome();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 24. GET /api/v1/catalog/recommended
exports.getRecommended = async (req, res) => {
  try {
    const data = await catalogService.getRecommendedProducts();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 25. GET /api/v1/catalog/deals
exports.getDeals = async (req, res) => {
  try {
    const data = await catalogService.getDeals();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 26. GET /api/v1/catalog/deals/featured
exports.getFeaturedDeals = async (req, res) => {
  try {
    const data = await catalogService.getFeaturedDeals();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 27. GET /api/v1/catalog/deals/categories
exports.getDealCategories = async (req, res) => {
  try {
    const data = await catalogService.getDealCategories();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 28. GET /api/v1/catalog/deals/:id
exports.getDealById = async (req, res) => {
  try {
    const data = await catalogService.getDealById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 29. GET /api/v1/catalog/sellers
exports.getSellers = async (req, res) => {
  try {
    const data = await catalogService.getSellers();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 30. GET /api/v1/catalog/sellers/:id
exports.getSellerById = async (req, res) => {
  try {
    const data = await catalogService.getSellerById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Seller not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 31. GET /api/v1/catalog/sellers/:id/products
exports.getSellerProducts = async (req, res) => {
  try {
    const data = await catalogService.getSellerProducts(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 32. GET /api/v1/catalog/sellers/:id/summary
exports.getSellerSummary = async (req, res) => {
  try {
    const data = await catalogService.getSellerSummary(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Seller not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 33. GET /api/v1/catalog/sellers/:id/ratings
exports.getSellerRatings = async (req, res) => {
  try {
    const data = await catalogService.getSellerRatings(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 34. GET /api/v1/catalog/sellers/:id/reviews
exports.getSellerReviews = async (req, res) => {
  try {
    const data = await catalogService.getSellerReviews(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
