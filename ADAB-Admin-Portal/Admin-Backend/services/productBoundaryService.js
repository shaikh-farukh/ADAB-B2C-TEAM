const pool = require('../db');

/**
 * Product Master, Category, and Brand Service Boundaries
 * Establishes formal service interface abstractions for Day-1 Karan work without implementing Day-3 Catalog logic.
 */

async function listCategoriesBoundary(queryParams = {}) {
  try {
    if (pool && typeof pool.query === 'function') {
      const res = await pool.query('SELECT id, name, slug, parent_id, is_active FROM categories LIMIT $1 OFFSET $2', [
        queryParams.limit || 50,
        queryParams.offset || 0
      ]);
      return { success: true, count: res.rowCount, data: res.rows };
    }
  } catch (err) {
    // DB pool fallback for contract boundaries
  }
  return {
    success: true,
    boundaryOnly: true,
    message: 'Category service boundary stub',
    data: [
      { id: 1, name: 'Beverages', slug: 'beverages', parent_id: null, is_active: true },
      { id: 2, name: 'Packaged Foods', slug: 'packaged-foods', parent_id: null, is_active: true }
    ]
  };
}

async function getCategoryByIdBoundary(id) {
  return {
    success: true,
    boundaryOnly: true,
    data: { id: Number(id) || id, name: 'Sample Category', slug: 'sample-category', is_active: true }
  };
}

async function listBrandsBoundary(queryParams = {}) {
  try {
    if (pool && typeof pool.query === 'function') {
      const res = await pool.query('SELECT id, name, slug, logo_url FROM brands LIMIT $1 OFFSET $2', [
        queryParams.limit || 50,
        queryParams.offset || 0
      ]);
      return { success: true, count: res.rowCount, data: res.rows };
    }
  } catch (err) {}
  return {
    success: true,
    boundaryOnly: true,
    message: 'Brand service boundary stub',
    data: [
      { id: 1, name: 'Nestle', slug: 'nestle' },
      { id: 2, name: 'Amul', slug: 'amul' }
    ]
  };
}

async function getBrandByIdBoundary(id) {
  return {
    success: true,
    boundaryOnly: true,
    data: { id: Number(id) || id, name: 'Sample Brand', slug: 'sample-brand' }
  };
}

async function listProductsMasterBoundary(queryParams = {}) {
  try {
    if (pool && typeof pool.query === 'function') {
      const res = await pool.query('SELECT id, name, sku, category_id, brand_id, status FROM products LIMIT $1 OFFSET $2', [
        queryParams.limit || 50,
        queryParams.offset || 0
      ]);
      return { success: true, count: res.rowCount, data: res.rows };
    }
  } catch (err) {}
  return {
    success: true,
    boundaryOnly: true,
    message: 'Product master service boundary stub',
    data: [
      { id: 'p-101', name: 'Amul Butter 500g', sku: 'AMUL-BUT-500', category_id: 1, brand_id: 2, status: 'ACTIVE' }
    ]
  };
}

async function getProductMasterByIdBoundary(id) {
  return {
    success: true,
    boundaryOnly: true,
    data: { id, name: 'Sample Product Master', sku: 'SAMPLE-SKU-001', status: 'ACTIVE' }
  };
}

module.exports = {
  listCategoriesBoundary,
  getCategoryByIdBoundary,
  listBrandsBoundary,
  getBrandByIdBoundary,
  listProductsMasterBoundary,
  getProductMasterByIdBoundary
};
