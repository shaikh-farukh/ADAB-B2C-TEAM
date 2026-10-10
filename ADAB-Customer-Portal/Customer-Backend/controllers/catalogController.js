const catalogService = require('../services/catalogService');

exports.getRecommended = async (req, res) => {
  try {
    const data = await catalogService.getRecommendedProducts();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const data = await catalogService.getProductById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductSellers = async (req, res) => {
  try {
    const data = await catalogService.getProductSellers(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRelatedProducts = async (req, res) => {
  try {
    const data = await catalogService.getRelatedProducts(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const filters = {
      q: req.query.q || '',
      category: req.query.category || null,
      categories: req.query.categories ? req.query.categories.split(',') : [],
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
      brand: req.query.brand || null,
      minRating: req.query.minRating ? parseFloat(req.query.minRating) : null,
      inStockOnly: req.query.inStockOnly === 'true',
      sortOrder: req.query.sortOrder || null,
      sortBy: req.query.sortBy || 'relevance',
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

exports.getSearchSuggestions = async (req, res) => {
  try {
    const q = req.query.q || '';
    const data = await catalogService.getSearchSuggestions(q);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const data = await catalogService.getCategories();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const data = await catalogService.getProductsByCategory(req.params.slug);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStores = async (req, res) => {
  try {
    const data = await catalogService.getStores();
    res.json({ success: true, data });
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

