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

exports.searchProducts = async (req, res) => {
  try {
    const q = req.query.q || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // Extract filters and sorting
    const filters = {
      category: req.query.category,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice) : null,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice) : null,
      brand: req.query.brand || null,
      minRating: req.query.minRating ? parseFloat(req.query.minRating) : null,
      inStockOnly: req.query.inStockOnly === 'true'
    };
    const sortBy = req.query.sortBy || 'relevance';

    const data = await catalogService.searchProducts(q, page, limit, filters, sortBy);
    res.json({ success: true, data, pagination: { total: data.length, page, limit } });
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
