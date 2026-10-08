const productService = require('../services/productBoundaryService');

async function getProductsMaster(req, res) {
  const result = await productService.getProductsMaster(req.query);
  res.status(200).json(result);
}

async function getProductMasterById(req, res) {
  const result = await productService.getProductMasterById(req.params.id);
  if (!result.success) {
    return res.status(result.status || 404).json(result);
  }
  res.status(200).json(result);
}

async function createProductMaster(req, res) {
  const result = await productService.createProductMaster(req.body);
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }
  res.status(201).json(result);
}

async function updateProductMaster(req, res) {
  const result = await productService.updateProductMaster(req.params.id, req.body);
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }
  res.status(200).json(result);
}

async function addProductVariant(req, res) {
  const result = await productService.addProductVariant(req.params.id, req.body);
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }
  res.status(201).json(result);
}

async function getProductListings(req, res) {
  const result = await productService.getProductListings(req.params.id, req.query);
  res.status(200).json(result);
}

async function getCategories(req, res) {
  const result = await productService.getCategories(req.query);
  res.status(200).json(result);
}

async function getCategoryById(req, res) {
  const result = await productService.getCategoryById(req.params.id);
  if (!result.success) {
    return res.status(result.status || 404).json(result);
  }
  res.status(200).json(result);
}

async function createCategory(req, res) {
  const result = await productService.createCategory(req.body);
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }
  res.status(201).json(result);
}

async function updateCategory(req, res) {
  const result = await productService.updateCategory(req.params.id, req.body);
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }
  res.status(200).json(result);
}

async function getBrands(req, res) {
  const result = await productService.getBrands(req.query);
  res.status(200).json(result);
}

async function getBrandById(req, res) {
  const result = await productService.getBrandById(req.params.id);
  if (!result.success) {
    return res.status(result.status || 404).json(result);
  }
  res.status(200).json(result);
}

async function createBrand(req, res) {
  const result = await productService.createBrand(req.body);
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }
  res.status(201).json(result);
}

async function updateBrand(req, res) {
  const result = await productService.updateBrand(req.params.id, req.body);
  if (!result.success) {
    return res.status(result.status || 400).json(result);
  }
  res.status(200).json(result);
}

module.exports = {
  getProductsMaster,
  getProductMasterById,
  createProductMaster,
  updateProductMaster,
  addProductVariant,
  getProductListings,
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  getBrands,
  getBrandById,
  createBrand,
  updateBrand
};
