const catalogService = require('../services/catalogService');

exports.getRecommended = async (req, res) => {
  try {
    const data = await catalogService.getRecommendedProducts();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const filters = {
      q: req.query.q || '',
      categories: req.query.categories ? req.query.categories.split(',') : [],
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      sortOrder: req.query.sortOrder,
      page: req.query.page,
      limit: req.query.limit
    };
    const data = await catalogService.searchProducts(filters);
    res.json({ success: true, data, pagination: { total: data.length, page: filters.page || 1, limit: filters.limit || 20 } });
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

exports.getProductById = async (req, res) => {
  try {
    const data = await catalogService.getProductById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Product not found' });
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
