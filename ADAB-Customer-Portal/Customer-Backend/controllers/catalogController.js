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
    const q = req.query.q || '';
    const data = await catalogService.searchProducts(q);
    res.json({ success: true, data, pagination: { total: data.length, page: 1, limit: 10 } });
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
