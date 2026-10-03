import pool from '../Config/database.js';
import logger from '../utils/logger.js';
import { saveBase64Image } from '../Helpers/imageSaver.js';
import { invalidateCatalogCache } from './distributorCatalogController.js';
import { Readable } from 'stream';
import csv from 'csv-parser';

// Add Product
export const addProduct = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    logger.info(`Adding product for manufacturer: ${manufacturerId}`, { body: req.body });

    const {
      product_name,
      product_image,
      category,
      sub_category,
      description,
      sku,
      unit,
      currency,
      price,
      manufacturer_price,
      distributor_price,
      retail_price,
      moq,
      stock_quantity,
      north_hub,
      south_hub,
      central_hub,
      international_selling,
      international_price,
      export_hs_code,
      hsn_code,
      gst_rate,
      tier_pricing,
      status
    } = req.body;

    // Check if product name already exists for this manufacturer
    const existingProduct = await pool.query(
      'SELECT id FROM manage_manufacturer_products WHERE manufacturer_id = $1 AND product_name = $2 AND deleted_at IS NULL',
      [manufacturerId, product_name]
    );

    if (existingProduct.rows.length > 0) {
      logger.warn(`Conflict: Product name already exists. Manufacturer: ${manufacturerId}, Name: ${product_name}`);
      return res.status(400).json({
        success: false,
        message: 'Product with this name already exists'
      });
    }

    // 3-Tier Pricing Fallbacks & Validation
    const basePrice = parseFloat(price || 0);
    const rPrice = retail_price !== undefined && retail_price !== null ? parseFloat(retail_price) : basePrice;
    const dPrice = distributor_price !== undefined && distributor_price !== null ? parseFloat(distributor_price) : Math.round(rPrice * 0.85 * 100) / 100;
    const mPrice = manufacturer_price !== undefined && manufacturer_price !== null ? parseFloat(manufacturer_price) : Math.round(rPrice * 0.70 * 100) / 100;

    if (mPrice > dPrice || dPrice > rPrice) {
      return res.status(422).json({
        success: false,
        message: 'Invalid pricing tiers: manufacturer_price <= distributor_price <= retail_price constraint violated',
        pricing: { manufacturer_price: mPrice, distributor_price: dPrice, retail_price: rPrice }
      });
    }

    // Category & Subcategory ID Resolution + SKU Generation
    let categoryId = null;
    let subcategoryId = null;

    if (category) {
      const catRes = await pool.query(
        'SELECT id FROM manage_b_to_b_categories WHERE manufacturer_id = $1 AND category_name = $2 AND deleted_at IS NULL',
        [manufacturerId, category]
      );
      if (catRes.rows.length > 0) {
        categoryId = catRes.rows[0].id;

        if (sub_category) {
          const subCatRes = await pool.query(
            'SELECT id FROM manage_b_to_b_subcategories WHERE category_id = $1 AND subcategory_name = $2 AND deleted_at IS NULL',
            [categoryId, sub_category]
          );
          if (subCatRes.rows.length > 0) {
            subcategoryId = subCatRes.rows[0].id;
          }
        }
      }
    }

    // Auto-generate unique SKU if not provided
    const finalSku = sku || `SKU-M${manufacturerId}-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const savedImagePath = await saveBase64Image(product_image, 'products');

    const nHub = parseInt(north_hub || 0);
    const sHub = parseInt(south_hub || 0);
    const cHub = parseInt(central_hub || (stock_quantity || 0));
    const calculatedTotalStock = nHub + sHub + cHub;

    let parsedTierPricing = null;
    if (tier_pricing) {
      try {
        parsedTierPricing = typeof tier_pricing === 'string' ? JSON.parse(tier_pricing) : tier_pricing;
      } catch(e) {
        logger.warn('Failed to parse tier_pricing', e);
      }
    }

    let category_id = null;
    let subcategory_id = null;

    if (category) {
      const catRes = await pool.query('SELECT id FROM manage_b_to_b_categories WHERE category_name = $1 AND manufacturer_id = $2 AND deleted_at IS NULL', [category, manufacturerId]);
      if (catRes.rows.length > 0) {
        category_id = catRes.rows[0].id;
      }
    }

    if (sub_category && category_id) {
      const subRes = await pool.query('SELECT id FROM manage_b_to_b_subcategories WHERE subcategory_name = $1 AND category_id = $2 AND deleted_at IS NULL', [sub_category, category_id]);
      if (subRes.rows.length > 0) {
        subcategory_id = subRes.rows[0].id;
      }
    }

    const insertQuery = `
      INSERT INTO manage_manufacturer_products (
        manufacturer_id, category_id, subcategory_id, sku, product_name, product_image, category, sub_category,
        description, price, manufacturer_price, distributor_price, retail_price, unit, currency,
        moq, stock_quantity, north_hub, south_hub, central_hub, warehouse_stock,
        international_selling, international_price, export_hs_code, hsn_code, gst_rate, tier_pricing, status, created_at, created_by, active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 
        $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, 
        $22, $23, $24, $25, $26, $27::jsonb, $28, CURRENT_TIMESTAMP, $1, true
      )
      RETURNING *
    `;

    const values = [
      manufacturerId, // 1
      categoryId, // 2
      subcategoryId, // 3
      finalSku, // 4
      product_name, // 5
      savedImagePath || null, // 6
      category || null, // 7
      sub_category || null, // 8
      description || null, // 9
      rPrice, // 10
      mPrice, // 11
      dPrice, // 12
      rPrice, // 13
      unit || 'Piece', // 14
      currency || '₹', // 15
      moq || 1, // 16
      calculatedTotalStock, // 17
      nHub, // 18
      sHub, // 19
      cHub, // 20
      calculatedTotalStock, // 21
      international_selling || false, // 22
      international_price || null, // 23
      export_hs_code || null, // 24
      hsn_code || null, // 25
      gst_rate || null, // 26
      parsedTierPricing ? JSON.stringify(parsedTierPricing) : null, // 27
      status || 'active' // 28
    ];

    const result = await pool.query(insertQuery, values);
    logger.info(`Product added successfully. ID: ${result.rows[0].id}`, { manufacturerId });

    // Invalidate distributor catalog Redis cache
    await invalidateCatalogCache();

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Add product error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to add product'
    });
  }
};

// Get All Products (with pagination)
export const getProducts = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    const { status, category } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    logger.info(`Fetching products for manufacturer: ${manufacturerId}`, { status, category, page, limit });

    let baseQuery = `
      FROM manage_manufacturer_products
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
    `;

    const queryParams = [manufacturerId];
    let paramIndex = 2;

    // Filter by status if provided
    if (status) {
      baseQuery += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Filter by category if provided
    if (category) {
      baseQuery += ` AND category = $${paramIndex}`;
      queryParams.push(category);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, queryParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // Get paginated results
    let selectQuery = `SELECT * ${baseQuery} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(selectQuery, queryParams);

    res.status(200).json({
      success: true,
      pagination: {
        total: totalItems,
        totalItems,
        totalPages,
        page,
        currentPage: page,
        limit
      },
      data: result.rows
    });

  } catch (error) {
    logger.error('Get products error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
};

// Get Single Product
export const getProduct = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Fetching product detail. ID: ${id}, Manufacturer: ${manufacturerId}`);

    const query = `
      SELECT * FROM manage_manufacturer_products
      WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [id, manufacturerId]);

    if (result.rows.length === 0) {
      logger.warn(`Product not found. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Get product detail error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
};

// Update Product
export const updateProduct = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Updating product. ID: ${id}, Manufacturer: ${manufacturerId}`, { body: req.body });

    // Fetch existing product first for price validation & image preservation
    const existingRes = await pool.query(
      'SELECT * FROM manage_manufacturer_products WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL',
      [id, manufacturerId]
    );

    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const existingProduct = existingRes.rows[0];

    const allowedFields = [
      'product_name',
      'sku',
      'product_image',
      'category',
      'sub_category',
      'category_id',
      'subcategory_id',
      'description',
      'sku',
      'unit',
      'currency',
      'price',
      'manufacturer_price',
      'distributor_price',
      'retail_price',
      'unit',
      'moq',
      'stock_quantity',
      'international_selling',
      'international_price',
      'export_hs_code',
      'hsn_code',
      'gst_rate',
      'tier_pricing',
      'status'
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'product_image') {
          if (req.body.product_image === null || req.body.product_image === '') {
            // Explicit image removal
            updates.product_image = null;
          } else if (req.body.product_image === existingProduct.product_image) {
            // Image preserved as-is
            updates.product_image = existingProduct.product_image;
          } else {
            // New image provided (base64 or url)
            updates.product_image = await saveBase64Image(req.body[field], 'products');
          }
        } else if (field === 'tier_pricing') {
          try {
            updates[field] = typeof req.body[field] === 'string' ? req.body[field] : JSON.stringify(req.body[field]);
          } catch(e) {
            updates[field] = null;
          }
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    // Auto-resolve category_id & subcategory_id if category/sub_category are updated
    const finalCategory = updates.category || existingProduct.category;
    const finalSubcategory = updates.sub_category || existingProduct.sub_category;

    if (finalCategory) {
      const catRes = await pool.query(
        'SELECT id FROM manage_b_to_b_categories WHERE manufacturer_id = $1 AND category_name = $2 AND deleted_at IS NULL',
        [manufacturerId, finalCategory]
      );
      if (catRes.rows.length > 0) {
        updates.category_id = catRes.rows[0].id;
        if (finalSubcategory) {
          const subRes = await pool.query(
            'SELECT id FROM manage_b_to_b_subcategories WHERE category_id = $1 AND subcategory_name = $2 AND deleted_at IS NULL',
            [updates.category_id, finalSubcategory]
          );
          if (subRes.rows.length > 0) {
            updates.subcategory_id = subRes.rows[0].id;
          }
        }
      }
    }

    // 3-Tier Price validation during update
    const finalRPrice = updates.retail_price !== undefined ? parseFloat(updates.retail_price) : (updates.price !== undefined ? parseFloat(updates.price) : parseFloat(existingProduct.retail_price || existingProduct.price || 0));
    const finalDPrice = updates.distributor_price !== undefined ? parseFloat(updates.distributor_price) : parseFloat(existingProduct.distributor_price || (finalRPrice * 0.85));
    const finalMPrice = updates.manufacturer_price !== undefined ? parseFloat(updates.manufacturer_price) : parseFloat(existingProduct.manufacturer_price || (finalRPrice * 0.70));

    if (finalMPrice > finalDPrice || finalDPrice > finalRPrice) {
      return res.status(422).json({
        success: false,
        message: 'Invalid pricing tiers: manufacturer_price <= distributor_price <= retail_price constraint violated',
        pricing: { manufacturer_price: finalMPrice, distributor_price: finalDPrice, retail_price: finalRPrice }
      });
    }

    // Synchronize price columns
    updates.manufacturer_price = finalMPrice;
    updates.distributor_price = finalDPrice;
    updates.retail_price = finalRPrice;
    updates.price = finalRPrice;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // If product name is being updated, check for duplicates
    if (updates.product_name) {
      const existingNameCheck = await pool.query(
        'SELECT id FROM manage_manufacturer_products WHERE manufacturer_id = $1 AND product_name = $2 AND id != $3 AND deleted_at IS NULL',
        [manufacturerId, updates.product_name, id]
      );

      if (existingNameCheck.rows.length > 0) {
        logger.warn(`Conflict: Product name already exists. Manufacturer: ${manufacturerId}, Name: ${updates.product_name}`);
        return res.status(400).json({
          success: false,
          message: 'Product with this name already exists'
        });
      }
    }

    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const paramCount = Object.keys(updates).length;
    const values = [...Object.values(updates), manufacturerId, id];

    const query = `
      UPDATE manage_manufacturer_products
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount + 2} AND manufacturer_id = $${paramCount + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(query, values);

    logger.info(`Product updated successfully. ID: ${id}`, { manufacturerId });

    // Invalidate Redis catalog cache
    await invalidateCatalogCache();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Update product error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to update product'
    });
  }
};

// Delete Product
export const deleteProduct = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  try {
    logger.info(`Deleting product. ID: ${id}, Manufacturer: ${manufacturerId}`);

    const query = `
      UPDATE manage_manufacturer_products
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
      WHERE id = $2 AND manufacturer_id = $1 AND deleted_at IS NULL
      RETURNING id
    `;

    const result = await pool.query(query, [manufacturerId, id]);

    if (result.rows.length === 0) {
      logger.warn(`Product not found for deletion. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    logger.info(`Product deleted successfully. ID: ${id}`, { manufacturerId });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    logger.error(`Delete product error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

// Toggle Product Status
export const toggleProductStatus = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { status } = req.body;
  try {
    logger.info(`Toggling product status. ID: ${id}, Manufacturer: ${manufacturerId}, Status: ${status}`);

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be "active" or "inactive"'
      });
    }

    const result = await pool.query(
      `UPDATE manage_manufacturer_products
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND manufacturer_id = $3 AND deleted_at IS NULL
       RETURNING id, status`,
      [status, id, manufacturerId]
    );

    if (result.rows.length === 0) {
      logger.warn(`Product not found for status toggle. ID: ${id}, Manufacturer: ${manufacturerId}`);
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    logger.info(`Product status updated. ID: ${id}, Status: ${status}`, { manufacturerId });

    res.status(200).json({
      success: true,
      message: `Product ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error(`Toggle product status error. ID: ${id}`, error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to update status'
    });
  }
};

// Get Product Statistics
export const getProductStats = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    logger.info(`Fetching product statistics for manufacturer: ${manufacturerId}`);

    const query = `
      SELECT
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE status = 'active') as active_products,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_products,
        COUNT(*) FILTER (WHERE international_selling = true) as international_products,
        SUM(stock_quantity) as total_stock
      FROM manage_manufacturer_products
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [manufacturerId]);

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    logger.error('Get product stats error', error, { manufacturerId });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
};

/**
 * GET /api/manufacturers/products/:id/warehouses
 * Fetch warehouse stock breakdown for a specific product
 */
export const getWarehouseStock = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;

  try {
    const query = `
      SELECT
        id,
        product_name,
        stock_quantity,
        COALESCE(north_hub, 0) as north_hub,
        COALESCE(south_hub, 0) as south_hub,
        COALESCE(central_hub, 0) as central_hub,
        warehouse_stock
      FROM manage_manufacturer_products
      WHERE id = $1 AND manufacturer_id = $2 AND deleted_at IS NULL
    `;

    const result = await pool.query(query, [id, manufacturerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    const row = result.rows[0];
    const nHub = parseInt(row.north_hub || 0);
    const sHub = parseInt(row.south_hub || 0);
    const cHub = parseInt(row.central_hub || 0);

    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        product_name: row.product_name,
        stock_quantity: parseInt(row.stock_quantity || 0),
        north_hub: nHub,
        south_hub: sHub,
        central_hub: cHub,
        warehouse_stock: { north_hub: nHub, south_hub: sHub, central_hub: cHub }
      }
    });
  } catch (error) {
    logger.error(`Get warehouse stock error for product ID ${id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse stock allocation'
    });
  }
};

/**
 * PUT /api/manufacturers/products/:id/warehouses
 * Update stock allocation across North, South, and Central hubs
 */
export const updateWarehouseStock = async (req, res) => {
  const manufacturerId = req.user.userId;
  const { id } = req.params;
  const { north_hub, south_hub, central_hub } = req.body;

  try {
    const nHub = Math.max(0, parseInt(north_hub || 0));
    const sHub = Math.max(0, parseInt(south_hub || 0));
    const cHub = Math.max(0, parseInt(central_hub || 0));

    const calculatedTotalStock = nHub + sHub + cHub;

    const updateQuery = `
      UPDATE manage_manufacturer_products
      SET north_hub = $1,
          south_hub = $2,
          central_hub = $3,
          stock_quantity = $4,
          warehouse_stock = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND manufacturer_id = $7 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      nHub,
      sHub,
      cHub,
      calculatedTotalStock,
      calculatedTotalStock,
      id,
      manufacturerId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or unauthorized'
      });
    }

    const updatedProduct = result.rows[0];

    // Invalidate Redis catalog cache
    await invalidateCatalogCache();

    logger.info(`Warehouse stock updated for product ${id}. Total stock: ${calculatedTotalStock}`);

    res.status(200).json({
      success: true,
      message: 'Multi-warehouse stock allocated successfully',
      data: {
        id: updatedProduct.id,
        product_name: updatedProduct.product_name,
        stock_quantity: parseInt(updatedProduct.stock_quantity),
        north_hub: parseInt(updatedProduct.north_hub),
        south_hub: parseInt(updatedProduct.south_hub),
        central_hub: parseInt(updatedProduct.central_hub),
        warehouse_stock: { north_hub: nHub, south_hub: sHub, central_hub: cHub }
      }
    });

  } catch (error) {
    logger.error(`Update warehouse stock error for product ID ${id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to allocate warehouse stock'
    });
  }
};

/**
 * GET /api/manufacturers/products/warehouses
 * Fetch warehouse stock allocations for all products of a manufacturer
 */
export const getManufacturerWarehouseInventory = async (req, res) => {
  const manufacturerId = req.user.userId;

  try {
    const query = `
      SELECT
        id,
        product_name,
        category,
        stock_quantity,
        COALESCE(north_hub, 0) as north_hub,
        COALESCE(south_hub, 0) as south_hub,
        COALESCE(central_hub, 0) as central_hub,
        warehouse_stock
      FROM manage_manufacturer_products
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
      ORDER BY product_name ASC
    `;

    const result = await pool.query(query, [manufacturerId]);

    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows.map(row => ({
        id: row.id,
        product_name: row.product_name,
        category: row.category,
        stock_quantity: parseInt(row.stock_quantity || 0),
        north_hub: parseInt(row.north_hub || 0),
        south_hub: parseInt(row.south_hub || 0),
        central_hub: parseInt(row.central_hub || 0),
        warehouse_stock: {
          north_hub: parseInt(row.north_hub || 0),
          south_hub: parseInt(row.south_hub || 0),
          central_hub: parseInt(row.central_hub || 0)
        }
      }))
    });
  } catch (error) {
    logger.error('Get manufacturer warehouse inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch warehouse inventory'
    });
  }
};

export const bulkImportProducts = async (req, res) => {
  const manufacturerId = req.user.userId;
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const results = [];
  const errors = [];

  const stream = Readable.from(req.file.buffer.toString('utf8'));

  stream
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        let successCount = 0;
        let rowIndex = 1;
        for (const row of results) {
          rowIndex++;
          try {
            const {
              product_name, category, sub_category, description,
              price, stock_quantity, moq,
              hsn_code, gst_rate, international_price, tier_pricing
            } = row;

            if (!product_name || !price || !stock_quantity || !moq) {
              errors.push(`Row ${rowIndex}: Missing required fields`);
              continue;
            }

            let parsedTierPricing = null;
            if (tier_pricing) {
              try {
                parsedTierPricing = typeof tier_pricing === 'string' ? tier_pricing : JSON.stringify(tier_pricing);
                // Simple validation to check if it's parseable JSON
                JSON.parse(parsedTierPricing);
              } catch(e) {
                parsedTierPricing = null;
              }
            }

            const checkQuery = 'SELECT id FROM manage_manufacturer_products WHERE manufacturer_id = $1 AND product_name = $2 AND deleted_at IS NULL';
            const checkRes = await client.query(checkQuery, [manufacturerId, product_name]);

            if (checkRes.rows.length > 0) {
              const updateQuery = `
                UPDATE manage_manufacturer_products
                SET price = $1, stock_quantity = $2, moq = $3,
                    category = COALESCE($4, category),
                    sub_category = COALESCE($5, sub_category),
                    description = COALESCE($6, description),
                    hsn_code = COALESCE($7, hsn_code),
                    gst_rate = COALESCE($8, gst_rate),
                    international_price = COALESCE($9, international_price),
                    tier_pricing = COALESCE($10::jsonb, tier_pricing),
                    updated_at = NOW()
                WHERE id = $11
              `;
              await client.query(updateQuery, [
                price, stock_quantity, moq,
                category || null, sub_category || null, description || null,
                hsn_code || null, gst_rate || null, international_price || null,
                parsedTierPricing,
                checkRes.rows[0].id
              ]);
            } else {
              const insertQuery = `
                INSERT INTO manage_manufacturer_products (
                  manufacturer_id, product_name, category, sub_category,
                  description, price, stock_quantity, moq, hsn_code, gst_rate, international_price, tier_pricing
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
              `;
              await client.query(insertQuery, [
                manufacturerId, product_name, category || 'General', sub_category || '',
                description || '', price, stock_quantity, moq, hsn_code || null, gst_rate || null, international_price || null, parsedTierPricing
              ]);
            }
            successCount++;
          } catch (err) {
            errors.push(`Row ${rowIndex} error: ${err.message}`);
          }
        }

        await client.query('COMMIT');

        // Invalidate Redis catalog cache after successful bulk import
        if (successCount > 0) {
          await invalidateCatalogCache();
        }

        res.status(200).json({
          success: true,
          message: `Import complete. ${successCount} processed successfully.`,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Bulk import error:', err);
        res.status(500).json({ success: false, message: 'Bulk import failed' });
      } finally {
        client.release();
      }
    })
    .on('error', (err) => {
      res.status(500).json({ success: false, message: 'File parsing failed' });
    });
};

export const bulkExportProducts = async (req, res) => {
  const manufacturerId = req.user.userId;
  try {
    const query = `
      SELECT product_name, category, sub_category, description,
             price, stock_quantity, moq, hsn_code, gst_rate, international_price, tier_pricing
      FROM manage_manufacturer_products
      WHERE manufacturer_id = $1 AND deleted_at IS NULL
      ORDER BY product_name ASC
    `;
    const result = await pool.query(query, [manufacturerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No products found' });
    }

    const headers = Object.keys(result.rows[0]);
    let csvStr = headers.join(',') + '\n';

    result.rows.forEach(row => {
      const values = headers.map(header => {
        let val = row[header] === null || row[header] === undefined ? '' : typeof row[header] === 'object' ? JSON.stringify(row[header]) : String(row[header]);
        val = val.replace(/"/g, '""');
        if (val.includes(',') || val.includes('\n') || val.includes('"')) {
          val = `"${val}"`;
        }
        return val;
      });
      csvStr += values.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products_export.csv');
    res.status(200).send(csvStr);
  } catch (error) {
    logger.error('Bulk export error:', error);
    res.status(500).json({ success: false, message: 'Bulk export failed' });
  }
};