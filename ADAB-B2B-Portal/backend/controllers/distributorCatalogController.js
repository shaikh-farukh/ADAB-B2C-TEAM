import pool from '../Config/database.js';
import redisService from '../Config/redis.js';

/**
 * Invalidate all cached catalog entries in Redis
 */
export const invalidateCatalogCache = async () => {
  try {
    const cleared = await redisService.clearPrefix('catalog_');
    if (cleared) {
      console.log('🧹 [Redis] Distributor catalog cache invalidated successfully.');
    }
  } catch (error) {
    console.warn('⚠️ [Redis] Failed to clear catalog cache:', error.message);
  }
};

// Get products from approved manufacturers
export const getProducts = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const userRole = (req.user?.role || 'distributor').toLowerCase();
    const { search, category } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    // 1. Try fetching from Redis cache
    const cacheKey = `catalog_distributor:${distributorId}:role:${userRole}:cat:${category || 'all'}:search:${search ? search.trim().toLowerCase() : 'all'}:p:${page}:l:${limit}`;
    const cachedResponse = await redisService.get(cacheKey);

    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      return res.status(200).json(cachedResponse);
    }

    // Get distributor email (from JWT token if present, fallback to DB query)
    let distributorEmail = req.user?.email;
    if (!distributorEmail) {
      const distributorQuery = await pool.query(
        'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1 AND deleted_at IS NULL',
        [distributorId]
      );

      if (distributorQuery.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Distributor not found'
        });
      }
      distributorEmail = distributorQuery.rows[0].email;
    }

    let baseQuery = `
      FROM manage_manufacturer_products p
      INNER JOIN manage_b_to_b_userdetail m ON p.manufacturer_id = m.id
      INNER JOIN manage_b_to_b_request_access r ON m.id = r.manufacturer_id
      WHERE r.email_distributer = $1
        AND r.manufacture_request = 1
        AND r.distributer_request = 1
        AND p.status = 'active'
        AND p.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND r.deleted_at IS NULL
    `;

    const queryParams = [distributorEmail];
    let paramIndex = 2;

    // Search filter
    if (search && search.trim() !== '') {
      baseQuery += ` AND (p.product_name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Legacy single Category filter
    if (category && category !== 'All Categories' && category.trim() !== '') {
      baseQuery += ` AND p.category = $${paramIndex}`;
      queryParams.push(category.trim());
      paramIndex++;
    }

    // Count total products
    const countQuery = `SELECT COUNT(DISTINCT p.id) ${baseQuery}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    let selectQuery = `
      SELECT DISTINCT
        p.id,
        p.sku,
        p.product_name,
        p.product_image,
        p.category,
        p.price,
        p.manufacturer_price,
        p.distributor_price,
        p.retail_price,
        p.unit,
        p.currency,
        p.moq,
        p.stock_quantity,
        p.north_hub,
        p.south_hub,
        p.central_hub,
        p.warehouse_stock,
        p.international_selling,
        p.international_price,
        p.tier_pricing,
        p.created_at,
        m.company_name as manufacturer_name,
        m.id as manufacturer_id
      ${baseQuery}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await pool.query(selectQuery, queryParams);

    // Apply Server-Side RBAC Price Masking
    const mappedProducts = result.rows.map(row => {
      const baseProduct = {
        id: row.id,
        sku: row.sku,
        product_name: row.product_name,
        product_image: row.product_image,
        category: row.category,
        unit: row.unit || 'Piece',
        currency: row.currency || '₹',
        moq: parseInt(row.moq || 1),
        stock_quantity: parseInt(row.stock_quantity || 0),
        north_hub: parseInt(row.north_hub || 0),
        south_hub: parseInt(row.south_hub || 0),
        central_hub: parseInt(row.central_hub || 0),
        warehouse_stock: row.warehouse_stock || {
          north_hub: parseInt(row.north_hub || 0),
          south_hub: parseInt(row.south_hub || 0),
          central_hub: parseInt(row.central_hub || 0)
        },
        international_selling: row.international_selling ? 'Yes' : 'No',
        international_price: row.international_price ? parseFloat(row.international_price) : null,
        tier_pricing: typeof row.tier_pricing === 'string' ? JSON.parse(row.tier_pricing) : row.tier_pricing,
        manufacturer_name: row.manufacturer_name,
        manufacturer_id: row.manufacturer_id
      };

      const rPrice = parseFloat(row.retail_price || row.price || 0);
      const dPrice = parseFloat(row.distributor_price || (rPrice * 0.85));
      const mPrice = parseFloat(row.manufacturer_price || (rPrice * 0.70));

      if (userRole === 'consumer' || userRole === 'guest') {
        // Consumer / Guest sees retail_price (MRP) only
        return {
          ...baseProduct,
          price: rPrice,
          retail_price: rPrice
        };
      } else if (userRole === 'distributor' || userRole === 'wholesaler') {
        // Distributor sees manufacturer_price (their buy cost) and distributor_price (their selling price)
        return {
          ...baseProduct,
          price: dPrice,
          distributor_price: dPrice,
          manufacturer_price: mPrice,
          retail_price: rPrice
        };
      } else {
        // Manufacturer / Admin sees all three
        return {
          ...baseProduct,
          price: rPrice,
          manufacturer_price: mPrice,
          distributor_price: dPrice,
          retail_price: rPrice
        };
      }
    });

    const responsePayload = {
      success: true,
      count: mappedProducts.length,
      pagination: {
        total: totalItems,
        totalItems,
        totalPages,
        page,
        currentPage: page,
        limit
      },
      data: mappedProducts
    };

    // Store response in Redis with 300 seconds TTL (5 minutes)
    await redisService.set(cacheKey, responsePayload, 300);

    res.setHeader('X-Cache', 'MISS');
    res.status(200).json(responsePayload);

  } catch (error) {
    console.error('❌ Get products error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      errorCode: error.code
    });
  }
};

// Get product details
export const getProduct = async (req, res) => {
  try {
    const distributorId = req.user.userId;
    const { id } = req.params;

    console.log('📦 Fetching product:', id, 'for distributor:', distributorId);

    // Get distributor email
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1 AND deleted_at IS NULL',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      console.log('⚠️ Distributor not found');
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    const query = `
      SELECT
        p.*,
        m.company_name as manufacturer_name,
        m.id as manufacturer_id
      FROM manage_manufacturer_products p
      INNER JOIN manage_b_to_b_userdetail m ON p.manufacturer_id = m.id
      INNER JOIN manage_b_to_b_request_access r ON m.id = r.manufacturer_id
      WHERE p.id = $1
        AND r.email_distributer = $2
        AND r.manufacture_request = 1
        AND r.distributer_request = 1
        AND p.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND r.deleted_at IS NULL
    `;

    const result = await pool.query(query, [id, distributorEmail]);

    if (result.rows.length === 0) {
      console.log('⚠️ Product not found or not accessible');
      return res.status(404).json({
        success: false,
        message: 'Product not found or not accessible'
      });
    }

    console.log('✅ Product found:', result.rows[0].product_name);

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Get product error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all categories
export const getCategories = async (req, res) => {
  try {
    const distributorId = req.user.userId;

    console.log('📂 Fetching categories for distributor:', distributorId);

    // Get distributor email
    const distributorQuery = await pool.query(
      'SELECT email FROM manage_b_to_b_userdetail WHERE id = $1 AND deleted_at IS NULL',
      [distributorId]
    );

    if (distributorQuery.rows.length === 0) {
      console.log('⚠️ Distributor not found');
      return res.status(404).json({
        success: false,
        message: 'Distributor not found'
      });
    }

    const distributorEmail = distributorQuery.rows[0].email;

    const query = `
      SELECT DISTINCT p.category
      FROM manage_manufacturer_products p
      INNER JOIN manage_b_to_b_userdetail m ON p.manufacturer_id = m.id
      INNER JOIN manage_b_to_b_request_access r ON m.id = r.manufacturer_id
      WHERE r.email_distributer = $1
        AND r.manufacture_request = 1
        AND r.distributer_request = 1
        AND p.category IS NOT NULL
        AND p.category != ''
        AND p.deleted_at IS NULL
        AND m.deleted_at IS NULL
        AND r.deleted_at IS NULL
      ORDER BY p.category
    `;

    const result = await pool.query(query, [distributorEmail]);

    console.log('✅ Found', result.rows.length, 'categories');

    res.status(200).json({
      success: true,
      data: result.rows.map(row => row.category)
    });

  } catch (error) {
    console.error('❌ Get categories error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    });

    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};