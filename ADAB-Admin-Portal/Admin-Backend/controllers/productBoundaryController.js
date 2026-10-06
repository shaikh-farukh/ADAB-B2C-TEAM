const productService = require('../services/productBoundaryService');

async function getCategories(req, res) {
  const result = await productService.listCategoriesBoundary(req.query);
  res.status(200).json(result);
}

async function getCategoryById(req, res) {
  const result = await productService.getCategoryByIdBoundary(req.params.id);
  res.status(200).json(result);
}

async function getBrands(req, res) {
  const result = await productService.listBrandsBoundary(req.query);
  res.status(200).json(result);
}

async function getBrandById(req, res) {
  const result = await productService.getBrandByIdBoundary(req.params.id);
  res.status(200).json(result);
}

async function getProductsMaster(req, res) {
  const result = await productService.listProductsMasterBoundary(req.query);
  res.status(200).json(result);
}

async function getProductMasterById(req, res) {
  const result = await productService.getProductMasterByIdBoundary(req.params.id);
  res.status(200).json(result);
}

module.exports = {
  getCategories,
  getCategoryById,
  getBrands,
  getBrandById,
  getProductsMaster,
  getProductMasterById
};
